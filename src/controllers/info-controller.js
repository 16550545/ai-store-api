const Info = require('../models/Info')
const Auth = require('../models/Auth')
const jwt = require('jsonwebtoken')
const vt = require('../middleware/verify-token')

// Given that we will add info using third party python app
// instead via the frontend, We cannot rely on having a jwt 
// being sent to the server, hence why we use our ultra secret 
// hash 06d80eb0c50b49a509b49f2424e8c805

async function addInfo(req, res){
    console.log("Body of the addInfo request")
    console.log(req.body)
    let token = req.headers['x-access-token']
    let valid = await verifyToken(token)
    let { 
        peopleEntering,
        storePin,
    } = req.body

    let store = await Auth.findOne({pin: storePin})

    const timestamp = Date.now()
    const d = new Date()
    // Current day
    const currentDay = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    // Other day
    //const currentDay = new Date("2020-11-23")

    if(valid && store){
        if (peopleEntering == 0){
            const peopleInside = peopleEntering
            const maxPeople = 0
            const query = {pin: storePin}
            await Auth.findOneAndUpdate(query, {peopleInside, timestamp, currentDay, maxPeople})
            return res.status(201).send({msg: "Updated peopleInside and maxPeople to 0"})
        }else{
            const oldPeopleInside = store.peopleInside
            let peopleInside = oldPeopleInside + peopleEntering
            const maxPeople = Math.max(store.maxPeople, peopleInside)
            
            const query = {pin: storePin}
    
            await Auth.findOneAndUpdate(query, {peopleInside, timestamp, currentDay, maxPeople})
            const newInfo = new Info({peopleEntering, peopleInside, storePin, timestamp, currentDay, maxPeople})
            await newInfo.save()
            return res.status(201).send({msg: "Info added", info: newInfo})
        }
    }else{
        return res.status(403).send({msg: "Unauthorized"})
    }
}

async function getInfo(req, res){
    console.log("Query params of the getInfo request")
    console.log(req.query)
    //let token = req.headers['x-access-token']
    //let valid = await verifyToken(token)
    let { pin } = req.query
    let store = await Auth.findOne({pin})
    
    if(store){
        const storeInfo = await Info.find({storePin: pin}).sort({timestamp: "desc"})
        console.log({msg: "Info", info: storeInfo})
        return res.status(200).send({msg: "Info", info: storeInfo})
    }else{
        return res.status(403).send({msg: "No info"})
    }
}

async function getLast7DaysInfo(req, res){
    let { pin } = req.query
    let date = new Date()
    let store = Auth.findOne({pin})

    currentDay = date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()
    //currentDay = new Date("2020-11-13")
    lastWeek = date.getFullYear()+'-'+(date.getMonth()+1)+'-'+(date.getDate()-7)
    console.log(lastWeek)

    if (store){
        let last7DaysInfo = await Info.find({ storePin: pin, currentDay: { $gte: lastWeek, $lte: currentDay }}).sort({currentDay: 'desc'})
        console.log(last7DaysInfo)
        return res.status(200).send({msg: "Last 7 days info", info: last7DaysInfo})
    }else{
        return res.status(403).send({msg: "No info"})
    }
}

async function verifyToken(token){
    //console.log(token)
    if(!token){
        console.log({auth: false, message: 'No token provided'})
        return false;
    }else{
        let valid = await jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if(err){
                console.log({auth: false, message: 'Error validating token'})
                return false; 
            }else{
                console.log({auth: true, message: "Token validated!"})
                return true;
            }
        }).then(validated => {
            return validated
        })
        return valid
    }
}

module.exports = {
    addInfo,
    getInfo,
    getLast7DaysInfo
}