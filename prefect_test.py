from prefect import flow


@flow
def my_flow():
    print("Hello, Prefect!")

#PREFECT_API_URL="https://prefect-matter.up.railway.app/api"
#PREFECT_API_KEY=<YOUR-API-KEY-IF-USING-PREFECT-CLOUD>

if __name__ == "__main__":

    my_flow.serve(name="my-first-deployment")