# notes

Run the below commands to make it work:

1. Build docker container using: `docker build . --tag notes`
2. Run docker container using: `docker run -e DATABASE_URL="mariadb://username:password@localhost/notes" notes`
3. we will soon have kubernetes in next step.
