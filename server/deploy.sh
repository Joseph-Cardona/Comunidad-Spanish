gcloud run services update comunidad-server --region=us-central1
     --set-env-vars=NODE_ENV=production,DB_USER=postgres,DB_PASSWORD=BillionsMustLearn,DB_NAME=comunidad,INSTANCE_CONNECTION_NAME=synthesis-hack26svl-128:u
     s-central1:comunidad-db --set-cloudsql-instances=synthesis-hack26svl-128:us-central1:comunidad-db
