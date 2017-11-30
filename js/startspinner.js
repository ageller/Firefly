console.log("loading ...")

//hide the rest of the page
//d3.select("#ContentContainer").style("visibility","hidden");

// loader settings
var opts = {
  lines: 15, // The number of lines to draw
  length: 30, // The length of each line
  width: 15, // The line thickness
  radius: 50, // The radius of the inner circle
  color: '#4E2A84', // #rgb or #rrggbb or array of colors
  speed: 1.5, // Rounds per second
  trail: 75, // Afterglow percentage
  className: 'spinner', // The CSS class to assign to the spinner
};

var target = document.getElementById("loader");
d3.select("#splashdiv5").text("You will see a loading spinner until the data is loaded.");

// trigger spinner
var spinner = new Spinner(opts).spin(target);
