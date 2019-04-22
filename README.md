# Listudy
work in progress
## About
Listudy allows you to use spaced repetition to study opening repertoires, endgames and everything else you can express in a PGN.

## Development
Run the site locally
1. Clone the repo
2. `cd listudy/server`
3. `mv .env-example .env`
4. `go run main.go`
5. Visit localhost:8000

Change the Study Javascript
1. The Javascript for running the spaced repetition studying is located in the app folder
2. After making your changes run `make`
