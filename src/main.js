// Author: Joshua William Adams
// Rev History:
// No.: A     Desc.: Issued for review                          Date: 07/12/2019
// No.: 0     Desc.: Issued for use                             Date: 12/12/2019
//
// Description: Main application file which defines the main procedure for
// generating a nutrition plan.

// Import external librarys
// N/A

// Import custom module files
var fsOps = require("./modules/fs-ops.js")
var Solver = require("3x3-equation-solver");


/**
 * getMealMacros - solve the macros required per meal for a specific
 */
function getMealMacros (client, snacks, ingredients) {

  var snack_protein = 0
      , snack_fats = 0
      , snack_carbs = 0
      , snack_ingredients;

  for (var s = 0; s < snacks.length; s++) {

    snack_ingredients = ingredients.filter(function (row) {
      return row.MEAL_NAME === snacks[s].MEAL_NAME;
    })

    // calculate total snack macros
    for (var i = 0; i < snack_ingredients.length; i++) {

      snack_protein = snack_protein + snack_ingredients[i].QUANTITY * snack_ingredients[i].PROTEIN;
      snack_fats = snack_fats + snack_ingredients[i].QUANTITY * snack_ingredients[i].FATS;
      snack_carbs = snack_carbs + snack_ingredients[i].QUANTITY * snack_ingredients[i].CARBS;

    }
  }

  return {
    "PROTEIN": (client.PROTEIN - snack_protein) / (client.MEALS - snacks.length),
    "FATS": (client.FATS - snack_fats) / (client.MEALS - snacks.length),
    "CARBS": (client.CARBS - snack_carbs) / (client.MEALS - snacks.length)
  };
}

function solveThreeEquations (equationMatrix) {

  // 3a + b - 5c = 5
  // 4a + 2b + 7c = 19
  // 5a - 4b + c = 6
  var solution = Solver(equationMatrix, true);

  return solution.result;

}

function getThreeEquations (ingredients, macroDiffs) {
  var equationMatrix = [
        [],
        [],
        []
      ];

  // add x, y and z prefixes to each equation where x = quantity ingredient 1,
  // y = quantitiy ingredient 2 and z = quantity of ingredient 3
  for (var i = 0; i < ingredients.length; i++) {

    // Equation 1 - Protein Balance
    equationMatrix[0].push(ingredients[i].I_PROTEIN);

    // Equation 2 - Fat balance
    equationMatrix[1].push(ingredients[i].I_FATS);

    // Equation 3 - Carb balance
    equationMatrix[2].push(ingredients[i].I_CARBS);

  }

  // append balance values

  // Equation 1 - Protein Balance
  equationMatrix[0].push(macroDiffs.PROTEIN);

  // Equation 2 - Fat balance
  equationMatrix[1].push(macroDiffs.FATS);

  // Equation 3 - Carb balance
  equationMatrix[2].push(macroDiffs.CARBS);

  return equationMatrix;

}

function checkQuantitiesLogical (ingredients, qtyChanges) {

  var pass = true,
      totalQty;

  for (var i = 0; i < ingredients.length; i++) {

    totalQty = ingredients[i].QUANTITY + qtyChanges[i];

    // confirm total within allowable limits
    if (totalQty >= 0 && totalQty <= 5) {
      pass = true;
    } else {
      pass = false;
      break;
    }

  }

  return pass;

}

/**
 * getMealQtyChanges - solves the quantity updates required for each meal to fit
 * the current clients per meal macro requirements.
 */
function getMealQtyChanges (clientMacros, mealMacros, mealNutritionPlan) {

  var qtyChanges = [],
      equationDetails,
      ingredients = [],
  // Get macros to be balanced across 3 integrients
      macroDiffs = {
        "PROTEIN": clientMacros.PROTEIN - mealMacros.PROTEIN,
        "FATS": clientMacros.FATS - mealMacros.FATS,
        "CARBS": clientMacros.CARBS - mealMacros.CARBS
      },
  // difine all possible combinations of ingredients to solve macros across
      options1 = mealNutritionPlan,
      options2 = mealNutritionPlan.slice(1,mealNutritionPlan.length),
      options3 = mealNutritionPlan.slice(2,mealNutritionPlan.length);

  // loop through all combinations of ingredients
  for (var n1 = 0; n1 < options1.length; n1++) {

    for (var n2 = 0; n2 < options2.length; n2++) {

      for (var n3 = 0; n3 < options3.length; n3++) {

        // define ingredients to solve macros across
        ingredients = [];
        ingredients.push(options1[n1]);
        ingredients.push(options2[n2]);
        ingredients.push(options3[n3]);

        // create 3 equations with 3 unknwowns
        equationDetails = getThreeEquations(ingredients, macroDiffs);

        // solve 3 equations
        qtyChanges = solveThreeEquations(equationDetails);

        // assess equations for logical results
        // all ingredients passed checks
        if (checkQuantitiesLogical(ingredients, qtyChanges)) {
          return {
            "positions": [n1, n2 + 1, n3 + 2],
            "qtyChanges": qtyChanges
          }
        }

      }

    }

  }

  // unsolvable quantities
  return {
    "positions": [],
    "qtyChanges": []
  };

}

function updateIngredientQuantities (i, mealPlan, qtyChanges) {

  var found = false;

  // update ingredient one, two and three quantities
  for (var n = 0; n < qtyChanges.positions.length; n++) {
    if (i === qtyChanges.positions[n]) {
      mealPlan[i].QUANTITY_CHANGES = qtyChanges.qtyChanges[n];
      mealPlan[i].QUANTITY_FINAL = Math.round((mealPlan[i].QUANTITY + qtyChanges.qtyChanges[n])*4)/4;
      found = true;
      break;
    }
  }

  if (!found) {
    mealPlan[i].QUANTITY_CHANGES = 0;
    mealPlan[i].QUANTITY_FINAL = mealPlan[i].QUANTITY;
  }

  return mealPlan;

}

/**
 * updateMealPlanDetails - update meals nutritions plan with final quantities,
 * proteins, fats, carbs and calories.
 */
function updateMealPlanDetails (mealPlan, qtyChanges) {

  // loop through all items in meal
  for (var i = 0; i < mealPlan.length; i++) {

    // solved meal - snack or not
    if (qtyChanges.positions.length > 0) {

      found = false;

      mealPlan = updateIngredientQuantities(i, mealPlan, qtyChanges);

      // create final protein, fats, carbs and calorie values
      mealPlan[i].T_PROTEIN = mealPlan[i].I_PROTEIN * mealPlan[i].QUANTITY_FINAL;
      mealPlan[i].T_FATS = mealPlan[i].I_FATS * mealPlan[i].QUANTITY_FINAL;
      mealPlan[i].T_CARBS = mealPlan[i].I_CARBS * mealPlan[i].QUANTITY_FINAL;
      mealPlan[i].T_CALORIES = mealPlan[i].T_PROTEIN * 4 + mealPlan[i].T_FATS * 9 + mealPlan[i].T_CARBS * 4;

    // unsolveable case
    } else {

      mealPlan[i].QUANTITY_CHANGES = null;
      mealPlan[i].QUANTITY_FINAL = null;
      mealPlan[i].T_PROTEIN = null;
      mealPlan[i].T_FATS = null;
      mealPlan[i].T_CARBS = null;
      mealPlan[i].T_CALORIES = null;

    }

  }

  return mealPlan;
}

/**
 * getMealNutritionPlan - get nutritional plan for an individual meal.
 */
function getMealNutritionPlan (client, meal, meal_no, meal_ingredients, macros) {

  var ingredient,
      mealPlan = [],
      row,
      mealMacros = {
        "PROTEIN": 0,
        "FATS": 0,
        "CARBS": 0
      },
      qtyChanges;

  // loop through meal ingredients
  for (var i = 0; i < meal_ingredients.length; i++) {

    ingredient = meal_ingredients[i];

    // create new data format
    row = {
      // store client information
      "CLIENT": client.CLIENT,
      "PROTEIN": client.PROTEIN,
      "FATS": client.FATS,
      "CARBS": client.CARBS,
      "MEALS": client.MEALS,
      // store meal information
      "DAY": meal.DAY,
      "MEAL_NAME": meal_no + " - " + meal.MEAL_NAME,
      // store ingredient information
      "INGREDIENT": ingredient.INGREDIENT,
      "I_PROTEIN": ingredient.PROTEIN,
      "I_FATS": ingredient.FATS,
      "I_CARBS": ingredient.CARBS,
      "UNITS": ingredient.UNITS,
      "QUANTITY": ingredient.QUANTITY,
      // create new fields
      "QUANTITY_CHANGES": 0,
      "QUANTITY_FINAL": 0,
      "T_PROTEIN": 0,
      "T_FATS": 0,
      "T_CARBS": 0,
      "T_CALORIES": 0
    }

    mealPlan.push(row);

    // Store meal overall macros
    if (row.QUANTITY > 0) {
      mealMacros.PROTEIN = mealMacros.PROTEIN + ingredient.PROTEIN
      mealMacros.FATS = mealMacros.FATS + ingredient.FATS
      mealMacros.CARBS = mealMacros.CARBS + ingredient.CARBS
    }

  }

  // get changes to quantities based on client macros
  if (meal.SNACK === 1) {
    qtyChanges = {
      "positions": [0],
      "qtyChanges": [0]
    }
  } else {
    qtyChanges = getMealQtyChanges(macros, mealMacros, mealPlan);
  }

  // Update quantities to client macro requirements
  mealPlan = updateMealPlanDetails(mealPlan, qtyChanges);

  return mealPlan;

}

/**
 * solveNutritionPlans - loops through all clients, client meals and meal
 * ingredients and outputs all meals updated to suit client macros.
 */
function solveNutritionPlans (inputs) {

  // define all input tables
  var clients = inputs[0].data,
      client_meals = inputs[1].data,
      meal_ingredients = inputs[2].data,
  // define variables required in loops
      c_client,
      c_client_meals,
      c_meal,
      c_meal_ingrediants,
      c_snacks,
      c_macros,
      c_meal_no = 1,
  // define output variables
      nutritionPlans = [];

  // loop through all clients
  for (var c = 0; c < clients.length; c++) {

    c_client = clients[c];

    // get client specific information
    c_client_meals = client_meals.filter(function (row) { return row.CLIENT === c_client.CLIENT; });

    // loop through all clients meals
    for (var m = 0; m < c_client_meals.length; m++) {

      c_meal = c_client_meals[m];

      // get specific meal details
      c_meal_ingrediants = meal_ingredients.filter (function (row) {return row.MEAL_NAME === c_meal.MEAL_NAME;})
      c_snacks = client_meals.filter(function (row) { return row.CLIENT === c_client.CLIENT && row.DAY === c_meal.DAY && row.SNACK === 1; });
      c_macros = getMealMacros(c_client, c_snacks, meal_ingredients);

      // create plan nutrition plan for specific meal
      nutritionPlans = nutritionPlans.concat(getMealNutritionPlan(c_client, c_meal, c_meal_no, c_meal_ingrediants, c_macros));

      // update meal number
      // case 1 - no more meals
      if (!c_client_meals[m+1]) {
        c_meal_no = 1;
      // case 2 - meal changes
      } else if (c_meal.DAY === c_client_meals[m+1].DAY) {
        c_meal_no = c_meal_no + 1;
      // case 3 - meal remains the same
      } else {
        c_meal_no = 1;
      }

    }

  }

  return nutritionPlans;

}

////////////////////////////// Define main method //////////////////////////////

function createNutritionPlans () {

  // define input details
  var inputs = [{
    "table": "clients",
    "filePath": __dirname + "\\..\\inputs\\clients.csv",
    "data": []
  }, {
    "table": "client_meals",
    "filePath": __dirname + "\\..\\inputs\\client_meals.csv",
    "data": []
  }, {
    "table": "meal_ingredients",
    "filePath": __dirname + "\\..\\inputs\\meal_ingredients.csv",
    "data": []
  }], outputs = [{
    "filePath": __dirname + "\\..\\outputs\\nutrition-plans.xlsx",
    "template": __dirname + "\\..\\inputs\\nutrition-plans-template.xlsx"
  }], nutritionPlans;

  // Read and parse all inputs files
  fsOps.readCsv(inputs[0].filePath).then(function (res) {
    inputs[0].data = res;
    return fsOps.readCsv(inputs[1].filePath);
  }).then(function (res) {
    inputs[1].data = res;
    return fsOps.readCsv(inputs[2].filePath);
  }).then(function (res) {
    inputs[2].data = res;
    // get nutritional plan data for each client
    nutritionPlans = solveNutritionPlans(inputs);
    // output data to xlsx template
    fsOps.writeDataToFiles(outputs[0], nutritionPlans);
    return;
  }).catch(function (err) {
    console.log(err);
  });

  return;

}

////////////////////////////// Execute main method /////////////////////////////

createNutritionPlans();
