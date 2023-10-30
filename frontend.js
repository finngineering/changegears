/**
 * This script serves as an interface between the changegears.html calculator page and the actual calculation
 * engine in geartrain.js. It performs input validation, unit conversions, progresses the calculation through
 * geartrain.js and presents the results to the user.
 * 
 * The main page is available at www.finngineering.com/changegears.html and the source
 * code at github.com/finngineering/changegears
 *
 * 2023 Finngineering
 */

// Extract the parameters from the supplied URL string and return them as an array
function getUrlParameterArray(url) {
    var params = [];
    // Parameters come after '?'. No '?' means no parameters
    var urlParts = url.split("?");
    if(urlParts.length != 2) {
        return params;
    }
    // Parameters separated by '&'
    pieces = urlParts[1].split("&");
    // Go through all parameter pairs
    for(var i = 0; i < pieces.length; i++) {
        var pair = pieces[i].split('=');
        // Parameters should have a name and value
        if(pair.length != 2) {
            continue;
        }
        params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;
}

// Check whether the string is a valid number
// Shamelessly copied from https://stackoverflow.com/a/175787
function isNumber(str) {
    if (typeof str != "string") {
        return false // we only process strings!
    }
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

// Convert string to number, and return null in case invalid number
function toNumber(str) {
    if(!isNumber(str)) {
        return null;
    }
    return parseFloat(str);
}

// Check whether the string is a valid integer
// Shamelessly copied from https://stackoverflow.com/a/14636652
function isInteger(str) {
    if(!isNumber(str)) {
        return null;
    }
    var num = toNumber(str);
    return num === parseInt(num);
}

// Convert string to integer, and return null in case invalid integer
function toInteger(str) {
    if(!isInteger(str)) {
        return null;
    }
    return parseInt(toNumber(str));
}

// Return an array of integers based on the the string with comma-separated list of integers
function toIntegerArray(text) {
    // Only handle string input
    if(typeof text != "string") {
        return null;
    }

    // Split the string by commas
    var strNumbers = text.split(",");
    // Convert the parts to integers
    var numArray = [];
    for(var i=0; i < strNumbers.length; i++) {
        var num = toInteger(strNumbers[i]);
        if(num === null) {
            return null;
        }
        numArray.push(num);
    }
    return numArray;
}

// Front-end application class for GearTrainPermutations
class ChangeGearCalculator {
    constructor() {
        this.maxResultLines = 200;
    }

    // Get the value of the DOM element defined by "id"
    getInputText(id) {
        var element = document.getElementById(id);
        if(element && element.value) {
            return element.value;
        } else {
            return null;
        }
    }

    // Set the value of the DOM element defined by "id". Silently ignore errors
    setInputText(id, value) {
        if(!value) {
            return;
        }
        var element = document.getElementById(id);
        if(!element) {
            return;
        }
        element.value = value;
    }

    // Return the checked state of the checkbox or radio inputs, or false if the element is not found
    getInputChecked(id) {
        var element = document.getElementById(id);
        if(element && element.checked) {
            return true;
        } else {
            return false;
        }
    }

    // Set the checked state according to the checked state. Silently ignore errors,
    // and use "false" if check is not explicitly "true"
    setInputChecked(id, checked) {
        var setChecked = false;
        // Allow for both boolean and string values
        if(checked === true || (typeof checked == "string" && checked.toLowerCase(checked.trim) === "true")) {
            setChecked = true;
        }
        var element = document.getElementById(id);
        if(element) {
            element.checked = setChecked;
        }
    }

    // Parse window URL and set form inputs accordingly
    parseWindowUrl() {
        var params = getUrlParameterArray(window.location.href);
        this.setInputText("leadscrew-lead", params["leadscrew-lead"]);
        // Update radio buttons' state only if at least one of the parameters is defined
        if(!(params["leadscrew-mm"] == undefined && params["leadscrew-tpi"] == undefined)) {
            this.setInputChecked("leadscrew-mm", params["leadscrew-mm"]);
            this.setInputChecked("leadscrew-tpi", params["leadscrew-tpi"]);
        }
        this.setInputText("shaft-count", params["shaft-count"]);
        this.setInputText("input-gear-set", params["input-gear-set"]);
        if(params["input-set-shared"] != undefined) {
            this.setInputChecked("input-set-shared", params["input-set-shared"]);
        }
        this.setInputText("change-gear-set", params["change-gear-set"]);
        this.setInputText("desired-lead", params["desired-lead"]);
        // Update radio buttons' state only if at least one of the parameters is defined
        if(!(params["desired-mm"] == undefined && params["desired-tpi"] == undefined)) {
            this.setInputChecked("desired-mm", params["desired-mm"]);
            this.setInputChecked("desired-tpi", params["desired-tpi"]);
        }

        // Optional parameters
        this.setInputText("module", params["module"]);
        // Update radio buttons' state only if at least one of the parameters is defined
        if(!(params["module-mod"] == undefined && params["module-dp"] == undefined)) {
            this.setInputChecked("module-mod", params["module-mod"]);
            this.setInputChecked("module-dp", params["module-dp"]);
        }
        this.setInputText("input-adjacent-size", params["input-adjacent-size"]);
        this.setInputText("spacer-size", params["spacer-size"]);
        this.setInputText("min-shaft-distance", params["min-shaft-distance"]);
        this.setInputText("max-shaft-distance", params["max-shaft-distance"]);
    }

    // Return the parameter pair "id=id.value", but only if id.value is defined
    parameterStringIfValue(id) {
        var element = document.getElementById(id);
        if(element && element.value) { 
            return encodeURIComponent(id) + "=" + encodeURIComponent(element.value);
        }
        return "";
    }

    // Return the parameter pair "id=true" if checked is true (either boolean or string)
    parameterStringIfChecked(id, checked) {
        var element = document.getElementById(id);
        if(element && element.checked && element.checked == true) {
            return encodeURIComponent(id) + "=" + encodeURIComponent(element.checked);
        }
    }

    // Generate URL parameters according to current form inputs
    generateUrlParameters() {
        var allParams = [];
        // Push all parameters onto array, regardless of if they are valid or not
        allParams.push(this.parameterStringIfValue("leadscrew-lead"));
        allParams.push(this.parameterStringIfChecked("leadscrew-mm"));
        allParams.push(this.parameterStringIfChecked("leadscrew-tpi"));
        allParams.push(this.parameterStringIfValue("shaft-count"));
        allParams.push(this.parameterStringIfValue("input-gear-set"));
        allParams.push(this.parameterStringIfChecked("input-set-shared"));
        allParams.push(this.parameterStringIfValue("change-gear-set"));
        allParams.push(this.parameterStringIfValue("desired-lead"));
        allParams.push(this.parameterStringIfChecked("desired-mm"));
        allParams.push(this.parameterStringIfChecked("desired-tpi"));
        allParams.push(this.parameterStringIfValue("module"));
        allParams.push(this.parameterStringIfChecked("module-mod"));
        allParams.push(this.parameterStringIfChecked("module-dp"));
        allParams.push(this.parameterStringIfValue("input-adjacent-size"));
        allParams.push(this.parameterStringIfValue("spacer-size"));
        allParams.push(this.parameterStringIfValue("min-shaft-distance"));
        allParams.push(this.parameterStringIfValue("max-shaft-distance"));
        

        // Remove invalid and zero-length parameters
        var retParams = [];
        for(var i = 0; i < allParams.length; i++) {
            if(typeof allParams[i] == "string" && allParams[i].length > 0) {
                retParams.push(allParams[i]);
            }
        }
        return retParams;
    }

    formChanged() {
        this.updateCalulationLink();

        var sharedElement = document.getElementById("input-set-shared");
        var inputGearElement = document.getElementById("input-gear-set");
        if(sharedElement && inputGearElement) {
            if(sharedElement.checked) {
                this.inputGearSetSaved = inputGearElement.value;
                inputGearElement.value = "";
                inputGearElement.disabled = true;
            } else {
                inputGearElement.disabled = false;
                if(typeof this.inputGearSetSaved == "string") {
                    inputGearElement.value = this.inputGearSetSaved;
                }
            }
        }
    }

    // Update the calculation link according to form inputs
    updateCalulationLink() {
        var baseUrl = document.location.href.split("?")[0];
        var urlParams = this.generateUrlParameters().join("&");
        var url = baseUrl + "?" + urlParams;
        var element = document.getElementById("calculation-link");
        if(element) {
            element.href = url;
        }
    }

    // Validate all inputs. In case optional inputs are left empty, default (non-limiting) values are used
    validateInput() {
        var inputText;

        // Leadscrew lead
        this.leadscrewLead = toNumber(this.getInputText("leadscrew-lead"));
        if(this.leadscrewLead === null) {
            window.alert("Invalid leadscrew lead (number)");
            return false;
        }

        // Leadscrew unit
        this.leadscrewMm = this.getInputChecked("leadscrew-mm");
        this.leadscrewTpi = this.getInputChecked("leadscrew-tpi");
        // Ensure either mm or tpi is selected
        if(this.leadscrewMm + this.leadscrewTpi != 1) {
            window.alert("You need to select either mm or tpi for the leadscrew lead");
            return false;
        }
        if(this.leadscrewTpi) {
            // In case tpi is selected, we convert it to mm for internal use
            this.leadscrewLead = 25.4 / this.leadscrewLead;
        }

        // Number of shafts
        this.shaftCount = toInteger(this.getInputText("shaft-count"));
        if(this.shaftCount === null) {
            window.alert("Invalid number of shafts (integer)");
            return false;
        }

        // Change gear set
        this.changeGearSet = toIntegerArray(this.getInputText("change-gear-set"));
        if(this.changeGearSet === null || this.changeGearSet.length == 0) {
            window.alert("Invalid comma-separated list of change gears");
            return false;
        }

        // Input gears shared with change gears
        this.sharedInputGearSet = this.getInputChecked("input-set-shared");

        // Input gear set
        this.inputGearSet = toIntegerArray(this.getInputText("input-gear-set"));
        if(!this.sharedInputGearSet && (this.inputGearSet === null || this.inputGearSet.length == 0)) {
            window.alert("Invalid comma-separated list of input gears");
            return false;
        }

        // Desired lead
        this.desiredLead = toNumber(this.getInputText("desired-lead"));
        if(this.desiredLead === null) {
            window.alert("Invalid desired lead (number)");
            return false;
        }

        // Desired unit
        this.desiredMm = this.getInputChecked("desired-mm");
        this.desiredTpi = this.getInputChecked("desired-tpi");
        // Ensure either mm or tpi is selected
        if(this.desiredMm + this.desiredTpi != 1) {
            window.alert("You need to select either mm or tpi for the desired lead");
            return false;
        }
        if(this.desiredTpi) {
            // In case tpi is selected, we convert it to mm for internal use
            this.desiredLead = 25.4 / this.desiredLead;
        }

        // Gear module
        inputText = this.getInputText("module");
        this.module = toNumber(inputText);
        if(this.module === null) {
            if(typeof inputText == "string" && inputText.length > 0) {
                window.alert("Invalid gear module (number)");
                return false;
            } else {
                this.module = 1.0;
            }
        }

        // Gear module or diametral pitch
        this.moduleMod = this.getInputChecked("module-mod");
        this.moduleDp = this.getInputChecked("module-dp");
        // Ensure either mod or DP is selected
        if(this.moduleMod + this.moduleDp != 1) {
            window.alert("You need to select either mod or DP for the gear module");
            return false;
        }
        if(this.moduleDp) {
            // In case tpi is selected, we convert it to mm for internal use
            this.gearModule = 25.4 / this.moduleDp;
        }

        // Input adjacent size
        inputText = this.getInputText("input-adjacent-size");
        this.inputAdjacentSize = toNumber(inputText);
        if(this.inputAdjacentSize === null) {
            if(typeof inputText == "string" && inputText.length > 0) {
                window.alert("Invalid input adjacent size (number)");
                return false;
            } else {
                this.inputAdjacentSize = -1e9;
            }
        }

        // Empty gear (spacer) size
        inputText = this.getInputText("spacer-size");
        this.spacerSize = toNumber(inputText);
        if(this.spacerSize === null) {
            if(typeof inputText == "string" && inputText.length > 0) {
                window.alert("Invalid input adjacent size (number)");
                return false;
            } else {
                this.spacerSize = -1e9;
            }
        }

        // Min shaft distance
        inputText = this.getInputText("min-shaft-distance");
        this.minShaftDistance = toNumber(inputText);
        if(this.minShaftDistance === null) {
            if(typeof inputText == "string" && inputText.length > 0) {
                window.alert("Invalid min shaft distance (number)");
                return false;
            } else {
                this.minShaftDistance = 0.0;
            }
        }

        // Max shaft distance
        inputText = this.getInputText("max-shaft-distance");
        this.maxShaftDistance = toNumber(inputText);
        if(this.maxShaftDistance === null) {
            if(typeof inputText == "string" && inputText.length > 0) {
                window.alert("Invalid max shaft distance (number)");
                return false;
            } else {
                this.maxShaftDistance = 0.0;
            }
        }

        return true;
    }

    // Update calculation status
    updateCalculationStatus(status="") { //done=false, permutations=0, solutions=0) {
        var element = document.getElementById("calculation-status");
        if(element) {
            if(status != "") {
                element.innerHTML = "Calculation status: " + status;
            } else {
                var triedCount = this.permutations.foundSolutions + this.permutations.discardedSolutions + this.permutations.skippedSolutions;
                var totalCount = this.permutations.permutationCount;
                var percentage = Math.round(triedCount / totalCount * 100);
//                element.innerHTML = "Calculation status (" + percentage + "%): Tried " + triedCount + " of " + totalCount + " possible arrangments";
                element.innerHTML = "Calculation status (" + percentage + "%): Found " + this.permutations.foundSolutions + " valid solutions out of "
                    + totalCount + " possible arrangements (" + this.permutations.discardedSolutions + " rejected and " + this.permutations.skippedSolutions + " optimized out)";
            }
        }
    }

    // Create header for results table
    createResultsHeader() {
        var thead = document.getElementById("results-table-head");
        if(!thead) {
            return false;
        }

        var header;
        header = "<tr>\n";
        header += "<th>Match<br /><span class=\"unit\">%</span></th>\n";
        header += "<th>Lead<br /><span class=\"unit\">mm</span></th>\n";
        header += "<th>TPI<br /><span class=\"unit\">per inch</span></th>\n"
        header += "<th class=\"geartrain\">1</th>\n";
        header += "<th class=\"geartrain\"></th>\n"
        for(var i=2; i < this.shaftCount; i++) {
            header += "<th class=\"geartrain\">" + i + "</th>\n";
            header += "<th class=\"geartrain\"></th>\n";
        }
        header += "<th class=\"geartrain\">" + this.shaftCount + "</th>\n";
        header += "<th>Tooth force<br /><span class=\"unit\">relative</span></th>\n";
        header += "<th>Shaft distance<br /><span class=\"unit\">mm</span></th>\n";
        header += "</tr>\n";

        thead.innerHTML = header;  
    }

    // Populate results table with sorted results
    createResultsBody(gearTrains) {
        var tbody = document.getElementById("results-table-body");
        if(!tbody) {
            return false;
        }

        var horizLine = "<strike>&nbsp;&nbsp;</strike>" // Horizontal line to indicate where torque transfers between shafts
        var rows = "";
        // TODO: Don't hardcode maximum number of results
        for(var i = 0; i < this.maxResultLines && i < gearTrains.length; i++) {
            var train = gearTrains[i];
            var outputTop = true; // Variable to indicate whether torque transfer to the next shaft is from "top" or "bottom"
            rows += "<tr>";

            // Match %, lead in mm, and lead in tpi
            rows += "<td>" + Number(train.outputMultiplier/this.desiredOutputMultiplier*100).toFixed(2) + "%</td>";
            rows += "<td>" + Number(train.outputMultiplier*this.leadscrewLead).toFixed(3) + "</td>";
            rows += "<td>" + Number(25.4/(train.outputMultiplier*this.leadscrewLead)).toFixed(2) + "</td>";

            // Input shaft of the gear train
            rows += "<td class=\"geartrain\">" + train.shafts[0].outputGear + "<br />&nbsp;</td>";

            // Intermediate shafts of the gear train
            rows += "<td class=\"geartrain\">" + horizLine + "<br />&nbsp;</td>"
            for(var j = 1; j < this.shaftCount - 1; j++) {
                rows += "<td class=\"geartrain\">";
                if(train.shafts[j].gearCount == 2) {
                    if(outputTop) {
                        rows += train.shafts[j].inputGear + "<br />";
                        rows += train.shafts[j].outputGear;
                    } else {
                        rows += train.shafts[j].outputGear + "<br />";
                        rows += train.shafts[j].inputGear;
                    }
                    outputTop = !outputTop;
                } else {
                    if(!outputTop) {
                        rows += "&nbsp;<br />";
                    }
                    rows += train.shafts[j].inputGear;
                    if(outputTop) {
                        rows += "<br />&nbsp;";
                    }
                }
                if(outputTop) {
                    rows += "<td class=\"geartrain\">" + horizLine + "<br />&nbsp;</td>";
                } else {
                    rows += "<td class=\"geartrain\">&nbsp;<br />" + horizLine + "</td>";
                }
                rows += "</td>";
    
            }

            // Output shaft of the gear train
            if(outputTop) {
                rows += "<td class=\"geartrain\">" + train.shafts[this.shaftCount - 1].inputGear + "<br />&nbsp;</td>";
            } else {
                rows += "<td class=\"geartrain\">&nbsp;<br />" + train.shafts[this.shaftCount - 1].inputGear + "</td>";
            }

            // Max force
            rows += "<td>" + Math.round(train.maxForce * 1000)/1000 + "</td>";
            // Shaft distance
            // TODO: don't hardcode module to 1.0
            rows += "<td>" + train.shaftDistance(1.0) + "</td>";
            rows += "</tr>";
        }

        tbody.innerHTML = rows;
    }

    // Create a new GearTrainPermutations object and pass the input parameters to it
    setupCalculation() {
        // Calculate desired output multiplier
        this.desiredOutputMultiplier = this.desiredLead / this.leadscrewLead;

        // Create the actual object for the gear train calculations
        this.permutations = new GearTrainPermutations;
        this.permutations.shaftCount = this.shaftCount;
        this.permutations.sharedInputGearSet = this.sharedInputGearSet;
        if(!this.permutations.sharedInputGearSet) {
            this.permutations.inputGearSet = this.inputGearSet.sort(); // Gear sets should be sored
        }
        this.permutations.changeGearSet = this.changeGearSet.sort(); // Gear sets should be sorted
        this.permutations.desiredOutputMultiplier = this.desiredOutputMultiplier;

        this.permutations.module = this.module;
        this.permutations.minShaftDistance = this.minShaftDistance;
        this.permutations.maxShaftDistance = this.maxShaftDistance;
        this.permutations.inputAdjacentSize = this.inputAdjacentSize;
        this.permutations.spacerSize = this.spacerSize;

        this.permutations.setupCalculation();
    }

    // Finalize the calculation, i.e. sort the results etc.
    finalizeCalculation() {
        this.permutations.finalizeCalculation();
    }

    // Display the results
    displayResults() {
        this.updateCalculationStatus();
        this.createResultsHeader();
        this.createResultsBody(this.permutations.gearTrains);
    }

    // Progress the calculation
    iterate() {
        return this.permutations.iterate();
    }
}

var app = new ChangeGearCalculator();

// Handle form submission. Calculate!
function formSubmit(e) {
    if(e) {
        if(e.preventDefault) {
            e.preventDefault();
        }
    }

    if(!app.validateInput()) {
        return;
    }

    // Setup calculation and update status text
    app.setupCalculation();
    app.updateCalculationStatus();

    // Allow page redraw first and then start the calculation
    setTimeout(iterateSolution, 0);
}

// This function progresses the calculation and "calls" itself repeatedly to allow progress status to be shown on screen
function iterateSolution() {
    var completed = false;

    // Iterate through solutions, and allow updating the screen every 100 ms
    var startTime = new Date();
    do {
        completed = app.iterate();
        if(completed) {
            break;
        }

        var currentTime = new Date();
    } while(currentTime - startTime < 100);

    if(completed) {
        // Finalize the calculation and display the results
        app.finalizeCalculation();
        app.displayResults();

    } else {
        // Not yet done, update the progress status and continue
        app.updateCalculationStatus();
        setTimeout(iterateSolution, 0);
    }
}

// Setup the front-end when page is fully loaded
function pageLoaded() {
    // Fill form based on supplied URL parameters
    app.parseWindowUrl();

    // Assign callback to calculation button
    button = document.getElementById("calculate-button");
    if(button) {
        button.onclick = formSubmit;
    }

    // Update calculation status
    app.updateCalculationStatus("Not started");

    // Call the formChanged method now and every time the form is changed
    app.formChanged();
    var form = document.getElementById('changegears');
    if(form) {
        form.addEventListener('change', function() {
            app.formChanged();
        });
    }
}

// Start scripts only once the page is fully loaded
window.onload = pageLoaded;
