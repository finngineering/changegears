/**
 * This script contains classes and functions for performing gear train calculations. Given a specified amount of shafts
 * and available gear set(s), all permutations are generated and the gearbox ratio is calculated. Each shaft can contain
 * either one or two gears, which links the motion of the previous shaft to the next one. Constraints can be set to discard
 * invalid solutions. The calculation is progressed in smaller steps to prevent blocking for the total duration of the
 * calculation. The main "user" class is the GearTrainPermutations.
 * 
 * The main page is available at www.finngineering.com/changegears.html and the source
 * code at github.com/finngineering/changegears
 *
 * 2013 Finngineering
 */


// Simple class to describe a shaft containing either one or two gears where both rotate at the same speed
class Shaft {
    // Create a shaft with two (or one) gears. If outputGear is 0, it means that this shaft has only one gear, defined
    // by inputGear. In that case, a gear of size spacerSize is used for intereference calculations with other shafts.
    constructor(inputGear = 0, outputGear = 0, spacerSize = 0) {
        if(outputGear > 0) {
            // Normal shaft with separate input and output gears
            this.gearCount = 2;
            this.inputGear = inputGear;
            this.outputGear = outputGear;
            this.spacerSize = spacerSize;
        } else {
            // Shaft with a single gear used both for input and output
            this.gearCount = 1;
            this.inputGear = inputGear;
            this.outputGear = inputGear;
            this.spacerSize = spacerSize;
        }
    }
}

// Check if there is interference between two shafts. The addendum is added to each of the gears
// that should clear each other, in order to take the tooth height into account. Take note that
// even if input:output does not interfere, the opposite output:input may do so.
function shaftsInterfere(input, output, addendum = 1.25) {
    // Calculate the distance between meshing gears
    var meshingDistance = input.outputGear + output.inputGear;

    // Calculate the distance between non-meshing gears, taking into account that the teeth
    // (addendum) must clear each other
    var nonMeshingDistance = 0;
    // Add the distance based on the first shaft
    if(input.gearCount == 1) {
        nonMeshingDistance += input.spacerSize;
    } else {
        nonMeshingDistance += input.inputGear;
    }
    // Add the distance based on the second shaft
    if(output.gearCount == 1) {
        nonMeshingDistance += output.spacerSize;
    } else {
        nonMeshingDistance += output.outputGear;
    }
    // Take into account that the teeth must also clear each other
    nonMeshingDistance += 2*addendum;

    // If distance required for non-meshing gears are larger than that for the meshing ones,
    // it means there is interference
    return nonMeshingDistance > meshingDistance;
}

// A class for a gear train consisting of any number of shafts. This can be used to e.g. to calculate
// the output multiplier, and is mainly used to keep track of GearTrainPermutations results
class GearTrain {
    constructor(shafts = []) {
        this.shafts = []
        this.outputMultiplier = -1;
        for(var i = 0; i < shafts.length; i++) {
            var newShaft = new Shaft();
            newShaft.gearCount = shafts[i].gearCount;
            newShaft.inputGear = shafts[i].inputGear;
            newShaft.outputGear = shafts[i].outputGear;
            newShaft.spacerSize = shafts[i].spacerSize;
            this.shafts.push(newShaft);
        }

        if(this.shafts.length > 0) {
            this.updateOutputMultiplier();
        }
    }

    updateOutputMultiplier() {
        this.outputMultiplier = 1.0;
        for(var i = 1; i < this.shafts.length; i++) {
            this.outputMultiplier *= this.shafts[i-1].outputGear / this.shafts[i].inputGear;
        }

        // TODO: should not be called from here...
        this.updateMaxForce();
        this.updateOutputFraction();
    }

    updateOutputFraction() {
        this.numerator = 1;
        this.denominator = 1;
        
        for(var i = 1; i < this.shafts.length; i++) {
            this.numerator *= this.shafts[i-1].outputGear;
            this.denominator *= this.shafts[i].inputGear;
        }

        this.outputMultiplier = this.numerator / this.denominator;
    }

    updateMaxForce() {
        var torque = 1.0;
        this.maxForce = torque / this.shafts[0].inputGear;
        for(var i = 1; i < this.shafts.length; i++) {
            // Calculate torque on this shaft
            torque *= this.shafts[i].inputGear / this.shafts[i-1].outputGear;

            // Select minimum force
            this.maxForce = Math.max(this.maxForce, torque / this.shafts[i].inputGear);
            this.maxForce = Math.max(this.maxForce, torque / this.shafts[i].outputGear);
        }
    }

    // Calculate the distance between the first and last shaft, given a specific module
    shaftDistance(module, firstShaft = 0, lastShaft = -1) {
        var distance = 0;

        // Check that we have at least two shafts to calculate a distance
        if(firstShaft > this.shafts.length - 2) {
            return 0;
        }

        // By default, we calculate the distance to the last shaft
        if(lastShaft == -1) {
            lastShaft = this.shafts.length;
        }

        for(var i = firstShaft + 1; i < lastShaft; i++) {
            // Calculate the pitch diameters of the gears
            var outputDiameter = this.shafts[i - 1].outputGear * module;
            var inputDiameter = this.shafts[i - 1].inputGear * module;

            distance += (outputDiameter + inputDiameter) / 2;
        }

        return distance;
    }

    toString() {
        if(this.shafts.length == 0) {
            return "";
        }

        var s = (Math.round(this.outputMultiplier * 100) / 100).toFixed(2);
        s += ": " + this.shafts[0].outputGear;
        for(var i = 1; i < this.shafts.length; i++) {
            s += ":";
            s += this.shafts[i].inputGear;
            if(this.shafts[i].gearCount == 2) {
                s += "-" + this.shafts[i].outputGear;
            }
        }
        return s;
    }
}

// Function to compare gear trains based on which is closer to 'desiredOutputMultiplier'.
// This is used to sort the calculation results
function compareGearTrains(a, b, desiredOutputMultiplier = 1.0) {
    var dev1 = Math.abs(a.outputMultiplier - desiredOutputMultiplier);
    var dev2 = Math.abs(b.outputMultiplier - desiredOutputMultiplier);

    var size1 = a.nominator * b.denominator;
    var size2 = b.nominator * a.denominator;

    return dev1 - dev2 || a.maxForce - b.maxForce;
}

class PermutationStackFrame {
    constructor(shafts, availableGears, currentShaft = 0, inputIndex = 0, outputIndex = 0) {
        this.shafts = shafts;
        this.availableGears = availableGears;
        this.currentShaft = currentShaft;
        this.inputIndex = inputIndex;
        this.outputIndex = outputIndex;
    }
}

// Class to calculate all possible gear box ratios, given a specified number of shafts and set of gears.
// Solutions which would have interference between non-meshing gears are discareded. Other constrains
// are planned for the future.
class GearTrainPermutations {
    constructor() {
        this.shaftCount = 0;
        this.shafts = [];
        this.changeGearSet = [];
        this.spacerSize = 0;
        this.gearTrains = []
        this.desiredOutputMultiplier = 1.0;
        // Normal gears have addendum 1.0 times module, but since we use this for interference calculations, we add
        // some margin
        this.addendum = 1.2;

        this.module = 1.0;
        this.minShaftDistance = 0;
        this.maxShaftDistance = 0;
    }

    // Calculate the amount of possible permutations, given that each shaft can have either one or two gears.
    // It seems probable that there is a nice combinatorial formula for this, but I don't know what it is...
    calculatePermutationCount(shaftCount, gearCount) {
        var sum = 0;

        // If we are on the last shaft, every gear can be used
        if(shaftCount == 1) {
            return gearCount;
        }

        // In case this shaft has a single gear, gearCount - 1 remains for the next shaft
        sum += gearCount * this.calculatePermutationCount(shaftCount - 1, gearCount - 1);

        // In case this shaft has two gears, gearCount - 2 remains for the next shaft
        sum += gearCount * (gearCount - 1) * this.calculatePermutationCount(shaftCount - 1, gearCount - 2);

        return sum;
    }

    // Check whether constraints up to currentShaft has been violated
    constraintsViolated(shafts, currentShaft) {
        // Nothing to check if we have only one shaft
        if(currentShaft == 0) {
            return false;
        }

        // Create a new GearTrain
        var train = new GearTrain(shafts.slice(0, currentShaft + 1));

        var distance = train.shaftDistance(this.module);
        if(this.minShaftDistance > 0 && distance < this.minShaftDistance) {
            return true;
        }
        if(this.maxShaftDistance > 0 && distance > this.maxShaftDistance) {
            return true;
        }

        return false;
    }

    // This function "recurses" and populates each shaft with one or two gears, and reports valid
    // (non-interfering) gear trains to the registerGearTrain function. This function uses optimisations
    // which rely on the availableGears being sorted in ascending order. Or at least it may do so in the
    // future.
    iterateShafts() {

        // Verify that we actually have something to calculate
        if(this.permutationStack.length <= 0) {
            // Calculation completed, return true
            return true;
        }

        // Get the current calculation state from the permutation stack
        var frame = this.permutationStack.pop();
        var shafts = frame.shafts;
        var availableGears = frame.availableGears;
        var currentShaft = frame.currentShaft;
        var inputIndex = frame.inputIndex;
        var outputIndex = frame.outputIndex;

        // If this is the final shaft, complete the calculation
        if(currentShaft == this.shafts.length - 1) {
            for(var lastIndex = 0; lastIndex < availableGears.length; lastIndex++) {
                // If there are two (or more) gears of the same size in the set, there is not need
                // to redo the calculations for all those gears. The result will anyway be the same
                if(lastIndex > 0 && availableGears[lastIndex - 1] == availableGears[lastIndex]) {
                    this.skippedSolutions += 1;
                    continue;
                }

                // Only one gear makes sense on the output shaft
                this.shafts[currentShaft] = new Shaft(availableGears[lastIndex], 0, this.spacerSize);

                if(this.constraintsViolated(this.shafts, currentShaft)) {
                    this.skippedSolutions += 1;
                    continue;
                }
                // Check if there is interference between the two last shafts
                // TODO: the second shaft will be out of bound in case we are at the first shaft
                if(!shaftsInterfere(this.shafts[currentShaft - 1], this.shafts[currentShaft], this.addendum)) {
                    // No interference, so report this complete gear train
                    this.registerGearTrain();
                    this.foundSolutions += 1;
                } else {
                    this.discardedSolutions += 1;
                }
            }
            return false;
        }

        // Select input and output gears for the shaft
        if(outputIndex >= availableGears.length) {
            outputIndex = 0;
            inputIndex += 1;
        }
        if(inputIndex >= availableGears.length) {
            return false;
        }

        // Select input and output gears
        var inputGear = availableGears[inputIndex];
        var outputGear = availableGears[outputIndex];
        var remainingGears = [].concat(availableGears)
        remainingGears.splice(inputIndex, 1)
        if(inputIndex == outputIndex) {
            // If the input and output indices refer to the same gear, we use only one gear for
            // this shaft, which is indicated by setting the output gear teeth count to 0
            outputGear = 0;
        } else {
            // Remove also the output gear from the remaining set
            if(outputIndex < inputIndex) {
                remainingGears.splice(outputIndex, 1);
            } else {
                remainingGears.splice(outputIndex - 1, 1);
            }
        }
        this.shafts[currentShaft] = new Shaft(inputGear, outputGear, this.spacerSize);

        // Update the stack frame for next time we return to this shaft
        frame.outputIndex = outputIndex + 1;
        frame.inputIndex = inputIndex;
        this.permutationStack.push(frame);

        // If there are several gears with the same teeth count, no need repeat those calculations
        if(outputIndex > 0 && outputGear > 0 && availableGears[outputIndex - 1] == availableGears[outputIndex]) {
            // Keep track of how many solutions we optimize out
            this.skippedSolutions += this.calculatePermutationCount(this.shafts.length - currentShaft - 1, remainingGears.length);
            return false;
        }

        // On to the next shaft
        var newFrame = new PermutationStackFrame(shafts, remainingGears, currentShaft + 1, 0, 0);
        this.permutationStack.push(newFrame);
        return false;

    }

    // Store the current gear train
    registerGearTrain() {
        var newGearTrain = new GearTrain(this.shafts);
        this.gearTrains.push(newGearTrain);
    }

    // This function needs to be called to setup internal variables prior to (successive) calls to iterate()
    setupCalculation() {
        this.shafts = new Array(this.shaftCount);

        // Reset solution counters
        this.foundSolutions = 0;
        this.skippedSolutions = 0;
        this.discardedSolutions = 0;

        // Setup a new iteration/recursion stack
        this.permutationStack = [];

        this.inputGearIndex = 0;

        // TODO, fix the permutation count to take into account the input shaft (below assumes a single fixed gear)
        if(this.sharedInputGearSet) {
            this.permutationCount = this.changeGearSet.length * this.calculatePermutationCount(this.shafts.length - 1, this.changeGearSet.length - 1)
        } else {
            this.permutationCount = this.inputGearSet.length * this.calculatePermutationCount(this.shafts.length - 1, this.changeGearSet.length);
        }
    }

    // This function should be called after iterate() returns true to sort the results, etc.
    finalizeCalculation() {
        var tmp = this.desiredOutputMultiplier;
        this.gearTrains.sort(function(a,b) {return compareGearTrains(a, b, tmp)});

        console.log("Calculations statistics:");
        console.log("From a total of " + this.permutationCount + " permutations");
        console.log(" - " + this.foundSolutions + " valid solutions");
        console.log(" - " + this.skippedSolutions + " skipped (optimizeed out) solutions");
        console.log(" - " + this.discardedSolutions + " rejected (due to constrains) solutions");
    }

    // Calling the iterate() method progresses the calculation by "one step". The return value is
    // true when the calculation is completed, and false while it is still in progress. The
    // setupCalculation() should be called (once) prior to this and finalizeCalculation() after.
    iterate() {
        // The first input gear is either selected from its own set of from the common change gears
        var firstGearSet;
        if(this.sharedInputGearSet) {
            firstGearSet = this.changeGearSet;
        } else {
            firstGearSet = this.inputGearSet;
        }

        // Check whether we are already finished
        if(this.inputGearIndex >= firstGearSet.length && this.permutationStack.length <= 0) {
            return true;
        }

        // If we already have a recursion (stack) in progress, continue with that
        if(this.permutationStack.length > 0) {
            return this.iterateShafts();
        }

        // If we have not gone through all input gears, continue iterating
        if(this.inputGearIndex < firstGearSet.length) {
            // The next input gear in line is chosen for the input shaft
            this.shafts[0] = new Shaft(firstGearSet[this.inputGearIndex], 0, this.inputAdjacentSize);

            // Setup the available gear set for the rest of the calculation
            var availableGearSet = [].concat(this.changeGearSet);
            if(this.sharedInputGearSet) {
                // If case of shared gear sets, we remove the already used one from the available gears
                var inputIndex = availableGearSet.indexOf(firstGearSet[this.inputGearIndex]);
                if(inputIndex != -1) {
                    availableGearSet.splice(inputIndex, 1);
                }
            }

            // Setup the recursion stack
            var frame = new PermutationStackFrame(this.shafts, availableGearSet, 1, 0, 0);
            this.permutationStack.push(frame)

            console.log("Starting calculation with input gear: " + firstGearSet[this.inputGearIndex])

            // Next time use the next gear
            this.inputGearIndex += 1;

            return this.iterateShafts();
        }
    }
}
