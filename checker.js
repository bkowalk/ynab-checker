var request = require('request');
var config = require('config')
var nodemailer = require('nodemailer');

var emailBody = ""

//configure email service
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.get("fromEmail"),
        pass: config.get("fromEmailPass")
    }
});

//configure YNAB API request
var requestOptions = {
    url: 'https://api.youneedabudget.com/v1/budgets/' + config.get("budgetID") + '/categories',
    headers:{'Authorization': 'Bearer ' + config.get("authToken")}
};

function todaysDate() {
    var now = new Date()
    return now.getDate()
  }

function daysInThisMonth() {
    var now = new Date()
    return new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
  }
  
function sendEmail(){
    transporter.sendMail({
       from: config.get("fromEmail"),
       to: config.get("toEmail"),
       subject: "Budget Balances",
       html: emailBody
    }, function(error, response){
        if(error){
            console.log(error);
        } else {
            console.log("Budget message sent.");
            transporter.close();
        }
    });
}

function processCategories(group){
    group.categories.forEach(function(category){
        name = category.name
        goal = category.goal_target/1000
        available = (category.budgeted + category.activity)/1000
        goalPerDay = goal / daysInThisMonth()

        availableIfOnPace = goal - todaysDate() * goalPerDay // If we were exactly on pace, how much we would have available today.
        availableToday = Math.round(available - availableIfOnPace) // How much we can spend today and stay on pace
        availableTodayZeroMin = (availableToday < 0) ? 0 : availableToday // Don't display a negative amount for today's paced amount, just a zero.
        daysSavedUp = Math.round(availableToday/goalPerDay) -1 // How many days of spending we've saved up (or negative for days behind)

        emailBody += "<h1 style='margin:0'>" + name + " - $" + availableTodayZeroMin + "</h1>"
                   + "<p style='margin-top:10px'>(" + daysSavedUp + " days saved up at $" + Math.round(goalPerDay) + "/day)</p>"
                   + "<p style='margin-bottom:60px;'>$" + Math.round(available) + " of $" + goal + " available"
    })
}

function processCategoriesJsonAndEmail(error, response, body){
    if(!error){
        budget = JSON.parse(body)
        budget.data.category_groups.forEach(function(group){
            if(group.name == config.get("categoryGroupName")){
                processCategories(group)
            }
        });
        sendEmail()
    }
}

request(requestOptions, processCategoriesJsonAndEmail)
