// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = "4-TP"; // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false; // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea = { x: 0, y: 0, h: 0, w: 0 } // Position and size of the user input area
let bcgColor;
let prev_click_x;
let prev_click_y;
//let sound;
//let sound_play;

// Metrics
let testStartTime, testEndTime; // time between the start and end of one attempt (54 trials)
let hits = 0; // number of successful selections
let misses = 0; // number of missed selections (used to calculate accuracy)
let database; // Firebase DB  

// Study control parameters
let draw_targets = false; // used to control what to show in draw()
let trials = []; // contains the order of targets that activate in the test
let current_trial = 0; // the current trial number (indexes into trials array above)
let attempt = 0; // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs = []; // add the Fitts ID for each selection here (-1 when there is a miss)


// Target class (position and width)
class Target {
    constructor(x, y, w) {
        this.x = x;
        this.y = y;
        this.w = w;
    }
}

// Runs once at the start
function setup() {
    createCanvas(700, 500); // window size in px before we go into fullScreen()
    frameRate(60); // frame rate (DO NOT CHANGE!)
    let target = getTargetBounds(0);
    prev_click_x = target.x;
    prev_click_y = target.y;

    bcgColor = color(0, 0, 0);

    randomizeTrials(); // randomize the trial order at the start of execution

    textFont("Arial", 18); // font size for the majority of the text
    drawUserIDScreen(); // draws the user start-up screen (student ID and display size)
}


function Fitts(x1, y1, x2, y2, radius) {
    let a = x1 - x2;
    let b = y1 - y2;
    let dist = Math.sqrt(a * a + b * b);
    return Math.log2(1 + (dist / radius));
}

//Plot line to next target and write text 2x when applicable
function draw_aux() {
    let prev_target = getTargetBounds(trials[current_trial - 1]);
    let curr_target = getTargetBounds(trials[current_trial]);
    let next_target = getTargetBounds(trials[current_trial + 1]);
    let input_prev_target = new Target(map(prev_target.x, 0, width, inputArea.x, inputArea.x + inputArea.w),
        map(prev_target.y, 0, height, inputArea.y, inputArea.y + inputArea.h),
        map(prev_target.w, 0, 0.5 * PPCM, 0, 15));
    let input_curr_target = new Target(map(curr_target.x, 0, width, inputArea.x, inputArea.x + inputArea.w),
        map(curr_target.y, 0, height, inputArea.y, inputArea.y + inputArea.h),
        map(curr_target.w, 0, 0.5 * PPCM, 0, 15));
    let input_next_target = new Target(map(next_target.x, 0, width, inputArea.x, inputArea.x + inputArea.w),
        map(next_target.y, 0, height, inputArea.y, inputArea.y + inputArea.h),
        map(next_target.w, 0, 0.5 * PPCM, 0, 15));


    stroke(color(255, 0, 0));
    line(curr_target.x, curr_target.y, next_target.x, next_target.y);
    strokeWeight(3);
    line(input_curr_target.x, input_curr_target.y, input_next_target.x, input_next_target.y);
    stroke(color(0, 255, 0));
    line(input_prev_target.x, input_prev_target.y, input_curr_target.x, input_curr_target.y);

    if (dist(curr_target.x, curr_target.y, next_target.x, next_target.y) === 0) {
        noStroke();
        textFont("Arial", 32);
        fill(color(0, 0, 255));
        textAlign(CENTER);
        text("2x", curr_target.x, curr_target.y + 16);
        textFont("Arial", 24);
        text("2x", input_curr_target.x, input_curr_target.y + 8);
    }
}

// Runs every frame and redraws the screen
function draw() {
    if (draw_targets) {
        // The user is interacting with the 6x3 target grid
        background(bcgColor); // sets background to black

        // Print trial count at the top left-corner of the canvas
        fill(color(255, 255, 255));
        textAlign(LEFT);
        textFont("Arial", 20);
        text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 25);

        textAlign(RIGHT);
        textFont("Arial", 32);
        text("Espera! O tempo ainda não está a contar. Lê isto primeiro:", width, inputArea.y - 1.15 * inputArea.h);
        textFont("Arial", 24);
        text("Acerta no alvo a verde, quando o alvo muda de cor podes carregar que contará como hit.", width, inputArea.y - 0.90 * inputArea.h);
        text("Quando aparecer o texto 2x dentro do alvo faz duplo clique - o próximo alvo é o mesmo.", width, inputArea.y - 0.75 * inputArea.h);
        text("A área de input é esta, podes esquecer o que está à esquerda e apenas tentar acertar", width, inputArea.y - 0.60 * inputArea.h);
        text("nos alvos olhando para aqui.", width, inputArea.y - 0.45 * inputArea.h);
        beginShape();
        vertex(inputArea.x + inputArea.w, inputArea.y);
        vertex(inputArea.x + (1 - 1 / 18) * inputArea.w, (1 - 1 / 10) * inputArea.y);
        vertex(inputArea.x + (1 - 1 / 36) * inputArea.w, (1 - 1 / 10) * inputArea.y);
        vertex(inputArea.x + (1 - 1 / 36) * inputArea.w, (1 - 1 / 4) * inputArea.y);
        vertex(inputArea.x + (1 + 1 / 36) * inputArea.w, (1 - 1 / 4) * inputArea.y);
        vertex(inputArea.x + (1 + 1 / 36) * inputArea.w, (1 - 1 / 10) * inputArea.y);
        vertex(inputArea.x + (1 + 1 / 18) * inputArea.w, (1 - 1 / 10) * inputArea.y);
        endShape();

        // Draw all 18 targets
        for (var i = 0; i < 18; i++) drawTarget(i);
        draw_aux();
        // Draw the user input area
        drawInputArea();

        // Draw the virtual cursor
        let x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width);
        let y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height);
        for (var i = 0; i < 18; i++) {
            if (getTargetBounds(i).x - 1.5 * PPCM < x && x < getTargetBounds(i).x + 1.5 * PPCM && getTargetBounds(i).y - 1.5 * PPCM < y && y < getTargetBounds(i).y + 1.5 * PPCM) {
                x = getTargetBounds(i).x;
                y = getTargetBounds(i).y;
            }
        }
        fill(color(0, 0, 0));
        circle(x, y, 0.5 * PPCM);
    }
}

// Print and save results at the end of 54 trials
function printAndSavePerformance() {
    // DO NOT CHANGE THESE! 
    let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
    let test_time = (testEndTime - testStartTime) / 1000;
    let time_per_target = nf((test_time) / parseFloat(hits + misses), 0, 3);
    let penalty = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
    let target_w_penalty = nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
    let timestamp = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();

    background(color(0, 0, 0)); // clears screen
    fill(color(255, 255, 255)); // set text fill color to white
    text(timestamp, 10, 20); // display time on screen (top-left corner)

    textAlign(CENTER);
    text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
    text("Hits: " + hits, width / 2, 100);
    text("Misses: " + misses, width / 2, 120);
    text("Accuracy: " + accuracy + "%", width / 2, 140);
    text("Total time taken: " + test_time + "s", width / 2, 160);
    text("Average time per target: " + time_per_target + "s", width / 2, 180);
    text("Average time for each target (+ penalty): " + target_w_penalty + "s", width / 2, 220);


    // Print Fitts IDS (one per target, -1 if failed selection, optional)
    for (var i = 0, col_y = 270; i < 27; col_y += 27, i++) {
        if (i == 0)
            text("Target " + (i + 1) + ": - - -", width * 1 / 3, col_y);
        else if (fitts_IDs[i] == -1)
            text("Target " + (i + 1) + ": MISSED", width * 1 / 3, col_y);
        else
            text("Target " + (i + 1) + ": " + fitts_IDs[i], width * 1 / 3, col_y);
    }
    for (var i = 27, col_y = 270; i < 54; col_y += 27, i++) {
        if (fitts_IDs[i] == -1)
            text("Target " + (i + 1) + ": MISSED", width * 2 / 3, col_y);
        else
            text("Target " + (i + 1) + ": " + fitts_IDs[i], width * 2 / 3, col_y);
    }
    // 

    // Saves results (DO NOT CHANGE!)
    let attempt_data = {
        project_from: GROUP_NUMBER,
        assessed_by: student_ID,
        test_completed_by: timestamp,
        attempt: attempt,
        hits: hits,
        misses: misses,
        accuracy: accuracy,
        attempt_duration: test_time,
        time_per_target: time_per_target,
        target_w_penalty: target_w_penalty,
        fitts_IDs: fitts_IDs
    }

    // Send data to DB (DO NOT CHANGE!)
    if (BAKE_OFF_DAY) {
        // Access the Firebase DB
        if (attempt === 0) {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
        }

        // Add user performance results
        let db_ref = database.ref('G' + GROUP_NUMBER);
        db_ref.push(attempt_data);
    }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
    // Only look for mouse releases during the actual test
    // (i.e., during target selections)
    if (draw_targets) {
        // Get the location and size of the target the user should be trying to select
        let target = getTargetBounds(trials[current_trial]);

        // Check to see if the virtual cursor is inside the target bounds,
        // increasing either the 'hits' or 'misses' counters

        if (insideInputArea(mouseX, mouseY)) {
            let virtual_x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
            let virtual_y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)
            for (var i = 0; i < 18; i++) {
                if (getTargetBounds(i).x - 1.5 * PPCM < virtual_x && virtual_x < getTargetBounds(i).x + 1.5 * PPCM && getTargetBounds(i).y - 1.5 * PPCM < virtual_y && virtual_y < getTargetBounds(i).y + 1.5 * PPCM) {
                    virtual_x = getTargetBounds(i).x;
                    virtual_y = getTargetBounds(i).y;
                }
            }

            if (dist(target.x, target.y, virtual_x, virtual_y) < target.w / 2) {
                hits++;
                let temp = Fitts(prev_click_x, prev_click_y, target.x, target.y, target.w);
                fitts_IDs.push(temp.toFixed(3));
            } else {
                misses++;
                fitts_IDs.push(-1);
            }
            prev_click_x = virtual_x;
            prev_click_y = virtual_y;
            current_trial++; // Move on to the next trial/target
        }

        // Check if the user has completed all 54 trials
        if (current_trial === trials.length) {
            testEndTime = millis();
            draw_targets = false; // Stop showing targets and the user performance results
            printAndSavePerformance(); // Print the user's results on-screen and send these to the DB
            attempt++;

            // If there's an attempt to go create a button to start this
            if (attempt < 2) {
                continue_button = createButton('START 2ND ATTEMPT');
                continue_button.mouseReleased(continueTest);
                continue_button.position(width / 2 - continue_button.size().width / 2, height / 2 - continue_button.size().height / 2);
            }
        } else if (current_trial === 1) testStartTime = millis();
    }
}

// Draw target on-screen
function drawTarget(i) {
    // Get the location and size for target (i)
    let target = getTargetBounds(i);
    let input_target = new Target(map(target.x, 0, width, inputArea.x, inputArea.x + inputArea.w),
        map(target.y, 0, height, inputArea.y, inputArea.y + inputArea.h),
        map(target.w, 0, 0.5 * PPCM, 0, 15));

    // Check whether this target is the target the user should be trying to select
    if (trials[current_trial] === i) {
        //FIXME target
        // Highlights the target the user should be trying to select
        // with green filling 
        fill(color(0, 255, 0));
        noStroke();
        circle(target.x, target.y, target.w);
        square(input_target.x - input_target.w / 2, input_target.y - input_target.w / 2, input_target.w, 8);
        if (insideInputArea(mouseX, mouseY)) {
            let virtual_x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
            let virtual_y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)
            for (var i = 0; i < 18; i++) {
                if (getTargetBounds(i).x - 1.5 * PPCM < virtual_x && virtual_x < getTargetBounds(i).x + 1.5 * PPCM && getTargetBounds(i).y - 1.5 * PPCM < virtual_y && virtual_y < getTargetBounds(i).y + 1.5 * PPCM) {
                    virtual_x = getTargetBounds(i).x;
                    virtual_y = getTargetBounds(i).y;
                }
            }

            if (dist(target.x, target.y, virtual_x, virtual_y) < target.w / 2) {
                fill(0, 255, 255);
                let width = input_target.w * 1.3;
                square(input_target.x - width / 2, input_target.y - width / 2, width, 8);
                return;
            }
        }

        // Remember you are allowed to access targets (i-1) and (i+1)
        // if this is the target the user should be trying to select
        //
    }

    // Does not draw a border if this is not the target the user
    // should be trying to select
    else {
        noStroke();
        // Draws the target
        fill(color(0, 4, 74));
        circle(target.x, target.y, target.w);
        fill(color(2, 4, 16));
        square(input_target.x - input_target.w / 2, input_target.y - input_target.w / 2, input_target.w, 8);
    }

    if (trials[current_trial + 1] === i) {
        stroke(color(255, 0, 0));
        strokeWeight(6);
        fill(color(0, 4, 74));
        circle(target.x, target.y, target.w);
        fill(color(2, 4, 16));
        square(input_target.x - input_target.w / 2, input_target.y - input_target.w / 2, input_target.w, 8);
    }
}

// Returns the location and size of a given target
function getTargetBounds(i) {
    var x = parseInt(LEFT_PADDING) + parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
    var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

    return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
    // Re-randomize the trial order
    shuffle(trials, true);
    current_trial = 0;
    print("trial order: " + trials);

    // Resets performance variables
    hits = 0;
    misses = 0;
    fitts_IDs = [];

    continue_button.remove();

    // Shows the targets again
    draw_targets = true;
    testStartTime = millis();
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);

    let display = new Display({ diagonal: display_size }, window.screen);

    // DO NOT CHANGE THESE!
    PPI = display.ppi; // calculates pixels per inch
    PPCM = PPI / 2.54; // calculates pixels per cm
    TARGET_SIZE = 1.5 * PPCM; // sets the target size in cm, i.e, 1.5cm
    TARGET_PADDING = 1.5 * PPCM; // sets the padding around the targets in cm
    MARGIN = 1.5 * PPCM; // sets the margin around the targets in cm

    // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
    LEFT_PADDING = width / 3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

    // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
    TOP_PADDING = height / 2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;

    // Defines the user input area (DO NOT CHANGE!)
    inputArea = {
        x: width / 2 + 2 * TARGET_SIZE,
        y: height / 2,
        w: width / 3,
        h: height / 3
    }

    // Starts drawing targets immediately after we go fullscreen
    draw_targets = true;
}

// Responsible for drawing the input area
function drawInputArea() {
    noFill();
    stroke(color(220, 220, 220));
    strokeWeight(2);

    rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
}