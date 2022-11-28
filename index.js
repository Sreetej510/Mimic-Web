const express = require("express")
const reload = require('reload')
const fs = require("fs")
const app = express()


app.use(express.static(__dirname + '/public'));

app.get("/record", function (req, res) {
    res.status(200).sendFile(__dirname + "/public/record.html")
});

app.get("/data", function (req, res) {
    var fileName = req.query.file
    var data = fs.readFileSync(__dirname + "/audio_data/" + fileName + ".json", 'utf8')
    res.status(200).send(data)
});


reload(app).then(() => {

    app.listen(3000, () => {
        console.log("listening to port 3000")
    })
}).catch((err) => {
    console.error(err);
})

