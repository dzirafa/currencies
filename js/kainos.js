// Alpha Vantage API Key - https://www.alphavantage.co/support/#api-key
var AV_API_KEY = 'JYYILOFZ9ZYRGC6P';

// Currencies for exchange rate
var fromCurrency= "EUR";
var toCurrency = "USD";

// Period of time for drawing the chart.
var timePeriod = "12h";
var startDate = new Date();

//Initial settings for stocks object.
var stockOptions = {
    symbol: fromCurrency + toCurrency,
    interval: '5min'
}

// Stocks object for retrieving data from Alpha Vantage server. https://github.com/wagenaartje/stocks.js/
var stocks = new Stocks(AV_API_KEY);

// Counts live rates retrieved from server.
var rateCounter = 0;


// When the chart was updated last time.
var lastChartUpdateT = 0;

// Alpha Vantage: Our standard API call frequency is 5 calls per minute and 500 calls per day.

//How often to get live rates
var rateRefreshInterval = 60 * 1000;      //60 seconds

//How often to redraw the chart
var chartRefreshInterval = 5 * 60 * 1000; //5 minutes

//Chart configuration
var chartConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
           label: "Historical data",
           data: [],
           backgroundColor: [
              'rgba(105, 0, 132, .2)',
           ],
           borderColor: [
              'rgba(200, 99, 132, .7)',
           ],
           fill: false,
           borderWidth: 2,
           stepped: false
        }]

    },
    options: {
        responsive: true,
        elements: {
            point:{
                radius: 0
            },
            line: {
                tension: 0 // disables bezier curves
            }
        },
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                },
                scaleLabel: {
                  display: true,
                  labelString: fromCurrency + toCurrency
                }
            }]

        },
        legend: {
            onClick: null
        }

    }
}

// Create chart object
var canvasContext = document.getElementById("lineChart").getContext('2d');
var stocksChart = new Chart(canvasContext, chartConfig);


var drawingChart = false;
async function drawHistoricalChart() {
//Retrieve historical data nad draw the chart.
    if (drawingChart)
      return;
    try{
        drawingChart = true;
        $("#errorMsg").text("");
        try{
            var historicalData = await stocks.timeSeries(stockOptions);
            if (historicalData.length <= 0){
              $("#errorMsg").text("Server returned no data for " + timePeriod + ". Alpha Vantage free API Key is limited to 5 calls per minute and 500 calls per day. Try again later.");
            }
            else{
              chartConfig.data.datasets[0].data = [];
              chartConfig.data.labels = [];
              var S = "";
              for (var i = historicalData.length - 1; i >= 0; i--){
                var date = new Date(historicalData[i]["date"]);
                if (date >= startDate && historicalData[i]["close"] > 0){
                    chartConfig.data.datasets[0].data.push(historicalData[i]["close"]);
                    chartConfig.data.labels.push(date.toLocaleString());
                }
              }

              chartConfig.data.datasets[0].label = "Historical data " + timePeriod;
              window.stocksChart.update();
              var currentDate = new Date();
              lastChartUpdateT = currentDate.getTime();
            }
        }
        catch(err){
            $("#errorMsg").text("Error downloading historical data. " + err);
        }
    }
    finally{
        drawingChart = false;
    }
}

function getStockOptions(){
//Read user options and sets options for retrieving data and drawing the chart.
    stockOptions.symbol = fromCurrency + toCurrency;

    var interval = '5min';
    var amount = 12 * 12;
    var currentDate = new Date();

    switch (timePeriod){
        case "12h":
            interval = '5min';
            amount = 12 * 12;
            var dayOfWeek = currentDate.getDay();
            if (dayOfWeek == 6){ // Saturday
              startDate.setDate(currentDate.getDate() - 1);
              startDate.setHours(12);
            }
            else
            if (dayOfWeek == 0){ // Sunday
              startDate.setDate(currentDate.getDate() - 2);
              startDate.setHours(12);
            }
            break;
        case "1D":
            interval = '5min';
            amount = 24 * 12;
            var dayOfWeek = currentDate.getDay();
            if (dayOfWeek == 6){ // Saturday
              startDate.setDate(currentDate.getDate() - 1);
              startDate.setHours(0);
            }
            else
            if (dayOfWeek == 0){ // Sunday
              startDate.setDate(currentDate.getDate() - 2);
              startDate.setHours(0);
            }
            break;
        case "1W":
            interval = '60min';
            amount = 7 * 24;
            startDate.setDate(currentDate.getDate() - 7);
            break;
        case "1M":
            interval = '60min';
            amount = 31* 24;
            startDate.setMonth(currentDate.getMonth() - 1);
            break;
        case "1Y":
            interval = 'daily';
            amount = 365;
            startDate.setFullYear(currentDate.getFullYear() - 1);
            break;
        case "2Y":
            interval = 'weekly';
            amount = 2 * 52;
            startDate.setFullYear(currentDate.getFullYear() - 2);
            break;
        case "5Y":
            interval = 'weekly';
            startDate.setFullYear(currentDate.getFullYear() - 5);
            amount = 5 * 52 + 2;
            break;
        case "10Y":
            interval = 'monthly';
            startDate.setFullYear(currentDate.getFullYear() - 10);
            amount = 10 * 52 + 3;
            break;
    }

    stockOptions.interval = interval;
    stockOptions.amount = amount;
}

function refreshChart(){
//Redraw the chart.
    chartConfig.options.scales.yAxes[0].scaleLabel.labelString = fromCurrency + toCurrency;
    getStockOptions();
    drawHistoricalChart();
}


var gettingLiveRates = false;
async function getLiveRates(){
/* Retrieve current live exchange rates.
  Set timer to refresh live rates after 1 minute (rateRefreshInterval).
  Refresh the chart each 5 minutes (chartRefreshInterval). */
    if (gettingLiveRates)
        return;
    try{
        gettingLiveRates = true;
        var found = false;
        await $.get('https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=' + fromCurrency + '&to_currency=' + toCurrency + '&apikey=' + AV_API_KEY, function(data) {
            for (var key in data) {
               if (key.indexOf("Realtime Currency Exchange Rate") >= 0) {
                  for (var key2 in data[key]) {
                     if (key2.indexOf("Exchange Rate") >= 0) {
                        rateCounter++;
                        $("#exchangeRate").text(/* "#" + rateCounter + ":  " + */ data[key][key2]);
                        found = true;
                        break;
                     }
                  }
               }
               if (found)
                 break;
            }

        });
        var currentDate = new Date();
        if (currentDate.getTime() - lastChartUpdateT > chartRefreshInterval){
          refreshChart();
        }
        setTimeout(getLiveRates, rateRefreshInterval);
    }
    finally{
        gettingLiveRates = false;
    }
}

async function getCurrencies(){
//Get the list of available forex currencies and fills dropdown menus/buttons.
   await $.get('https://openexchangerates.org/api/currencies.json', function(data) {
        var dropdownFrom = $("#currencyFrom");
        var dropdownTo = $("#currencyTo");
        var i = 0;
        for (var key in data) {
           {
              var btn = document.createElement("button");
              btn.className = "dropdown-item";
              btn.appendChild(document.createTextNode(key));
              dropdownFrom.append(btn);
              if (i == 0 || key == "EUR") {
                 setCurrencyFrom(key);
              }

              var btn = document.createElement("button");
              btn.className = "dropdown-item";
              btn.appendChild(document.createTextNode(key));
              dropdownTo.append(btn);
              if (i == 1 || key == "USD") {
                 setCurrencyTo(key);
              }
              i++;
           }
        }
        getLiveRates();
    });
}

function setCurrencyFrom(currencyName){
//Set fromCurrency. Return true when currency was changed.
  var result = false;
  {
    $("#dropdownMenu1").text(currencyName);
    $("#dropdownMenu1").val(currencyName);
    $("#labelFrom").text(currencyName);
    if (currencyName != fromCurrency){
      fromCurrency = currencyName;
      rateCounter = 0;
      result = true;
    }
  }
  return result;
}

function setCurrencyTo(currencyName){
//Set toCurrency. Return true when currency was changed.
  var result = false;
  {
    $("#dropdownMenu2").text(currencyName);
    $("#dropdownMenu2").val(currencyName);
    $("#labelTo").text(currencyName);
    if (currencyName != toCurrency){
      toCurrency = currencyName;
      rateCounter = 0;
      result = true;
    }
  }
  return result;
}

$(document).ready(function(){
//Set "onClick" events
  $("#timeButtons :input").change(function() {
      timePeriod = this.value;
      refreshChart();
  });

  $("#currencyFrom").on('click', 'button', function() {
        if (setCurrencyFrom($(this).text()))
            refreshChart();
  });

  $("#currencyTo").on('click', 'button', function() {
        if (setCurrencyTo($(this).text()))
            refreshChart();
  });

  $("#btnSwap").click(function() {
      var nameFrom = fromCurrency;
      setCurrencyFrom(toCurrency);
      setCurrencyTo(nameFrom);
      refreshChart();
  });
  
//Start - retrieve available currencies and draw the chart.
  setTimeout(getCurrencies, 100);
});
