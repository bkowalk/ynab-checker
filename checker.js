const config = require("config");
const fs = require("fs");
const nodemailer = require("nodemailer");
const request = require("request");

var firstArg = process.argv.slice(2)[0];

var htmlBody = "";

//configure email service
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.get("fromEmail"),
    pass: config.get("fromEmailPass"),
  },
});

//configure YNAB API request
var requestOptions = {
  url:
    "https://api.ynab.com/v1/budgets/" + config.get("budgetID") + "/categories",
  headers: { Authorization: "Bearer " + config.get("authToken") },
};

function todaysDate() {
  var now = new Date();
  return now.getDate();
}

function sendEmail() {
  transporter.sendMail(
    {
      from: config.get("fromEmail"),
      to: config.get("toEmail"),
      subject: "Budget Balances",
      html: htmlBody,
    },
    function (error, response) {
      if (error) {
        return console.log(error);
      }
      console.log("Email sent.");
      transporter.close();
    }
  );
}

function writeFile() {
  fs.writeFile(
    config.get("filePath"),
    '<html><body style="font-family:arial;background: black; color: white;">' +
      htmlBody +
      "</body></html>",
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("File output.");
    }
  );
}

function processCategories(group) {
  let groupTotal = 0;
  let groupTodayTotal = 0;

  group.categories.forEach(function (category) {
    name = category.name;
    goal = category.goal_target / 1000;
    available = category.balance / 1000;
    goalPerDay = goal / 31;

    availableIfOnPace = goal - todaysDate() * goalPerDay; // If we were exactly on pace, how much we would have available today.
    availableToday = available - availableIfOnPace; // How much we can spend today and stay on pace
    decimalDaysSavedUp = availableToday / goalPerDay; // How many days of spending we've saved up (or negative for days behind)
    daysSavedUp = Math.round(decimalDaysSavedUp); // Rounded off days we've saved up
    colorStyle = getColorStyle(daysSavedUp);

    groupTotal += available;
    groupTodayTotal += availableToday;

    htmlBody +=
      '<h1 style="margin:0;font-size: 30px;">' +
      name +
      ' <span style="' +
      colorStyle +
      '">' +
      (availableToday < 0 ? "-" : "") +
      "$" +
      Math.abs(Math.round(availableToday)) +
      ' <span style="font-size:16px;font-weight: 300;">(' +
      daysSavedUp +
      "d)</span></span></h1>" +
      '<p style="margin-bottom:20px; margin-top: 5px; color:#BBB">$' +
      Math.round(available) +
      " of $" +
      goal +
      ". Goal $" +
      Math.round(goalPerDay) +
      "/day</p>";
  });

  const discretionary = groupTotal - groupTodayTotal;

  htmlBody +=
    '<h1 style="margin:0;font-size: 30px;">Discretionary <span style="color: #00BB00;">$' +
    Math.abs(Math.round(discretionary)) +
    "</span></h1><p></p>";
}

function processSavings(group) {
  group.categories.forEach(function (category) {
    if (category.name != "Savings") {
      return;
    }

    budgeted = category.budgeted / 1000;
    colorStyle = getSavingsColorStyle(budgeted);
    available = category.balance / 1000;

    htmlBody +=
      '<h1 style="margin:0;font-size: 30px;' +
      colorStyle +
      '">' +
      (budgeted < 0 ? "Savings down $" : "Savings up $") +
      Math.abs(Math.round(budgeted)) +
      "</h1>" +
      '<p style="margin-bottom:20px; margin-top: 5px; color:#BBB">$' +
      Math.round(available) +
      " saved</p>";
  });
}

function processCategoriesJsonAndEmail(error, response, body) {
  if (!error) {
    budget = JSON.parse(body);
    budget.data.category_groups.forEach(function (group) {
      if (group.name == config.get("categoryGroupName")) {
        processCategories(group);
      }
      if (group.name == "Savings") {
        processSavings(group);
      }
    });

    writeFile();

    if (firstArg == "email") {
      sendEmail();
    }
  }
}

function getColorStyle(daysSavedUp) {
  if (daysSavedUp < -1) {
    return "color:#AA0000;";
  } else if (daysSavedUp <= 1) {
    return "color:#AAAAAA;";
  }
  return "color: #00BB00;";
}

function getSavingsColorStyle(savingsBudgeted) {
  if (savingsBudgeted < 0) {
    return "color:#AA0000;";
  }
  return "color: #00BB00;";
}

request(requestOptions, processCategoriesJsonAndEmail);
