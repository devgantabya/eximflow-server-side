const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://eximflow-db:qzEDAu2YAMduSPgW@cluster0.7smyhy0.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("exim_db");
        const productCollection = db.collection("products");
        const usersCollection = db.collection("users");
        const importsCollection = db.collection("imports");
        const exportsCollection = db.collection("exports");

        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                res.send({ message: 'user already exits. do not need to insert again' })
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        })

        app.get("/products", async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }
            const cursor = productCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/latest-products', async (req, res) => {
            const cursor = productCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        })

        app.post("/products", async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        })

        app.patch("/products/:id", async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id) };
            const update = {
                $set: {
                    name: updatedProduct.name,
                    price: updatedProduct.price
                }
            };
            const options = {};
            const result = await productCollection.updateOne(query, update, options);
            res.send(result);
        })

        app.patch("/products/:id/reduce", async (req, res) => {
            const id = req.params.id;
            const { reduceBy } = req.body;
            const query = { _id: new ObjectId(id) };
            const update = { $inc: { available_quantity: -reduceBy } };
            const result = await productCollection.updateOne(query, update);
            res.send(result);
        });

        app.delete("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })

        app.get("/myImports", async (req, res) => {
            const email = req.query.email;
            const query = email ? { importer_email: email } : {};
            const result = await importsCollection.find(query).toArray();
            res.send(result);
        });

        app.post("/myImports", async (req, res) => {
            const newImport = req.body;
            const result = await importsCollection.insertOne(newImport);
            res.send(result);
        });

        app.patch("/myImports/:id", async (req, res) => {
            const id = req.params.id;
            const { imported_quantity } = req.body;

            const result = await importsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { imported_quantity } }
            );
            res.send(result);
        });

        app.delete("/myImports/:id", async (req, res) => {
            const id = req.params.id;
            const result = await importsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get("/exports", async (req, res) => {
            const email = req.query.email;
            const query = email ? { exporter_email: email } : {};
            const exportsData = await exportsCollection.find(query).toArray();
            res.send(exportsData);
        });

        app.post("/exports", async (req, res) => {
            const newExport = req.body;
            newExport.created_at = new Date();

            try {
                const exportResult = await exportsCollection.insertOne(newExport);

                const productData = {
                    title: newExport.product_name,
                    image: newExport.product_image,
                    price: newExport.price,
                    email: newExport.exporter_email,
                    category: "Exports",
                    created_at: newExport.created_at,
                    origin_country: newExport.origin_country,
                    rating: newExport.rating,
                    available_quantity: newExport.available_quantity,
                    location: newExport.origin_country,
                };

                const productResult = await productCollection.insertOne(productData);

                res.send({
                    success: true,
                    message: "Export product added successfully!",
                    exportResult,
                    productResult,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ success: false, message: "Failed to add export product." });
            }
        });


        app.patch("/myExports/:id", async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            const query = { _id: new ObjectId(id) };

            const updateDoc = {
                $set: {
                    product_name: updatedData.product_name,
                    product_image: updatedData.product_image,
                    price: updatedData.price,
                    origin_country: updatedData.origin_country,
                    rating: updatedData.rating,
                    available_quantity: updatedData.available_quantity,
                },
            };

            const result = await exportsCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        app.delete("/myExports/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await exportsCollection.deleteOne(query);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
    console.log(`The server running on port: ${port}`)
})