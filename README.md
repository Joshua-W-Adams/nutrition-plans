# Nutrition Plans

An application used to automatically create nutrition plans for clients based off their overall required macros and meals.

## Getting Started

### Installing

1. Install nodejs console

```
- Node LTS v10.15.3
https://nodejs.org/en/download/releases/
```

2. Clone repository to your system using the following command or git desktop.

```
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY
```

4. Install node dependencies

```
npm install
```

### Running

1. Update all files in the input folder

```
clients.csv - list of all clients, macro and meal requirements
client_meals.csv - list of all clients meals on each day of the week. Also specifies if a meal is a snack or not.
meal_ingredients.csv - specifies the ingredients for each meal including macros, units and standard quantities.
```

2. Execute the following command

```
./src/> node main.js
```

3. Nutritional plan information is now summarised in the following folder

```
./outputs/
```

## Built With

* [Node.js](https://nodejs.org/en/) - JavaScript server runtime

## Authors

* **Joshua Adams** - *Software Engineer*

## License

This project has no licensed specified and is therefore covered under exclusive copyright by default. See [Choose a Liscence](https://choosealicense.com/no-license/) for details.
