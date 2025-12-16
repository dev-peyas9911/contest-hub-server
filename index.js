require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const admin = require('firebase-admin')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 3000
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString(
    'utf-8'
)
const serviceAccount = JSON.parse(decoded)
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
})

const app = express()
// middleware
app.use(
    cors({
        origin: [process.env.CLIENT_DOMAIN],
        credentials: true,
        optionSuccessStatus: 200,
    })
)
app.use(express.json())

// jwt middlewares
const verifyJWT = async (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1]
    console.log(token)
    if (!token) return res.status(401).send({ message: 'Unauthorized Access!' })
    try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.tokenEmail = decoded.email
        console.log(decoded)
        next()
    } catch (err) {
        console.log(err)
        return res.status(401).send({ message: 'Unauthorized Access!', err })
    }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})
async function run() {
    try {

        const db = client.db('contestsDB');
        const contestsCollection = db.collection('contests')
        const participatesCollection = db.collection('participates')
        const usersCollection = db.collection('users')

        // role middlewares
        const verifyADMIN = async (req, res, next) => {
            const email = req.tokenEmail
            const user = await usersCollection.findOne({ email })
            if (user?.role !== 'admin')
                return res
                    .status(403)
                    .send({ message: 'Admin only Actions!', role: user?.role })

            next()
        }
        const verifyCREATOR = async (req, res, next) => {
            const email = req.tokenEmail
            const user = await usersCollection.findOne({ email })
            if (user?.role !== 'creator')
                return res
                    .status(403)
                    .send({ message: 'Creator only Actions!', role: user?.role })

            next()
        }


        // save a contest data in db
        app.post('/contests', async (req, res) => {
            const contestData = req.body;
            // console.log(contestData);
            const result = await contestsCollection.insertOne(contestData);
            res.send(result);
        })

        // get all contest from db
        app.get('/contests', async (req, res) => {
            // search starts here
            const { search } = req.query;
            let query = {};
            if (search) {
                query = {
                    contestType: { $regex: search, $options: "i" }
                };
            }
            // search ends here

            const result = await contestsCollection.find(query).toArray()
            res.send(result)
        })

        // get 6 contests for popular section
        app.get("/contests/popular", async (req, res) => {
            const result = await contestsCollection
                .find()
                .sort({ participants: -1 }) // highest first
                .limit(6)
                .toArray();

            res.send(result);
        });

        // get one contest from db
        app.get('/contests/:id', async (req, res) => {
            const id = req.params.id
            const result = await contestsCollection.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        // Payment endpoints
        app.post('/create-checkout-session', async (req, res) => {
            const paymentInfo = req.body
            // console.log(paymentInfo)
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: paymentInfo?.name,
                                description: paymentInfo?.description,
                                images: [paymentInfo.image],
                            },
                            unit_amount: paymentInfo?.price * 100,
                        },
                        quantity: paymentInfo?.quantity,
                    },
                ],
                customer_email: paymentInfo?.customer?.email,
                mode: 'payment',
                metadata: {
                    contestId: paymentInfo?.contestId,
                    customer: paymentInfo?.customer.email,
                },
                success_url: `${process.env.CLIENT_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.CLIENT_DOMAIN}/contest/${paymentInfo?.contestId}`,
            })
            res.send({ url: session.url })
        })

        // save in db after payment
        app.post('/payment-success', async (req, res) => {
            const { sessionId } = req.body
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            const contest = await contestsCollection.findOne({
                _id: new ObjectId(session.metadata.contestId),
            })
            const order = await participatesCollection.findOne({
                transactionId: session.payment_intent,
            })

            if (session.status === 'complete' && contest && !order) {
                // save order data in db
                const orderInfo = {
                    contestId: session.metadata.contestId,
                    transactionId: session.payment_intent,
                    customer: session.metadata.customer,
                    status: 'paid',
                    creator: contest.creator,
                    name: contest.name,
                    contestType: contest.contestType,
                    quantity: 1,
                    price: session.amount_total / 100,
                    image: contest?.image,
                }
                const result = await participatesCollection.insertOne(orderInfo)
                // update plant quantity
                await contestsCollection.updateOne(
                    {
                        _id: new ObjectId(session.metadata.contestId),
                    },
                    { $inc: { participants: 1 } }
                )

                return res.send({
                    transactionId: session.payment_intent,
                    orderId: result.insertedId,
                })
            }
            res.send(
                res.send({
                    transactionId: session.payment_intent,
                    orderId: order._id,
                })
            )
        })

        // get all orders for a customer by email
        app.get('/my-participates', verifyJWT, async (req, res) => {
            // const email = req.params.email

            const result = await participatesCollection.find({ customer: req.tokenEmail }).toArray()
            res.send(result)
        })

        // get all orders for a seller by email
        app.get('/manage-orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email

            const result = await participatesCollection
                .find({ 'seller.email': email })
                .toArray()
            res.send(result)
        })

        // get all contests for a creator by email
        app.get('/created-contests/:email', async (req, res) => {
            const email = req.params.email

            const result = await contestsCollection
                .find({ 'creator.email': email })
                .toArray()
            res.send(result)
        })

        // save or update a user in db
        app.post('/user', async (req, res) => {
            const userData = req.body
            userData.created_at = new Date().toISOString()
            userData.last_loggedIn = new Date().toISOString()
            userData.role = 'participant'

            const query = {
                email: userData.email,
            }

            const alreadyExists = await usersCollection.findOne(query)
            // console.log('User Already Exists---> ', !!alreadyExists)

            if (alreadyExists) {
                // console.log('Updating user info......')
                const result = await usersCollection.updateOne(query, {
                    $set: {
                        last_loggedIn: new Date().toISOString(),
                    },
                })
                return res.send(result)
            }

            // console.log('Saving new user info......')
            const result = await usersCollection.insertOne(userData)
            res.send(result)
        })

        // get a user's role
        app.get('/user/role', verifyJWT, async (req, res) => {
            const result = await usersCollection.findOne({ email: req.tokenEmail })
            res.send({ role: result?.role })
        })

        // get all users for admin
        app.get('/users', verifyJWT, verifyADMIN, async (req, res) => {
            const adminEmail = req.tokenEmail
            const result = await usersCollection
                .find({ email: { $ne: adminEmail } })
                .toArray()
            res.send(result)
        })

        // update a user's role
        app.patch('/update-role', verifyJWT, verifyADMIN, async (req, res) => {
            const { email, role } = req.body
            const result = await usersCollection.updateOne(
                { email },
                { $set: { role } }
            )
            // await sellerRequestsCollection.deleteOne({ email })

            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 })
        console.log(
            'Pinged your deployment. You successfully connected to MongoDB!'
        )
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello from Server..')
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})