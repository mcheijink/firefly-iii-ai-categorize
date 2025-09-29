# Firefly III AI categorization

This project allows you to automatically categorize your expenses in [Firefly III](https://www.firefly-iii.org/) by
using OpenAI or a self-hosted Ollama model.

## Please fork me
Unfortunately i am not able to invest more time into maintaining this project. 

Feel free to fork it and create a PR that adds a link to your fork in the README file.

## How it works

It provides a webhook that you can set up to be called every time a new expense is added.

It will then generate a prompt for the configured Large Language Model (LLM), including your existing categories, the
recipient and the description of the transaction.

The LLM will, based on that prompt, guess the category for the transaction.

If it is one of your existing categories, the tool will set the category on the transaction and also add a tag to the
transaction.

If it cannot detect the category, it will not update anything.

## Privacy

Please note that some details of the transactions will be sent to the LLM as information to guess the category.

When using the OpenAI integration, the following fields are shared:

- Transaction description
- Name of transaction destination account
- Names of all categories

When using a self-hosted Ollama instance the following additional information is shared to improve the quality of the
classification:

- Transaction amount and currency
- Transaction date
- Source account name (if available)
- Existing notes, payment references, linked bill and budget names
- Tags already attached to the transaction

## Installation

### 1. Get a Firefly Personal Access Token

You can generate your own Personal Access Token on the Profile page. Login to your Firefly III instance, go to
"Options" > "Profile" > "OAuth" and find "Personal Access Tokens". Create a new Personal Access Token by clicking on
"Create New Token". Give it a recognizable name and press "Create". The Personal Access Token is pretty long. Use a tool
like Notepad++ or Visual Studio Code to copy-and-paste it.

![Step 1](docs/img/pat1.png)
![Step 2](docs/img/pat2.png)
![Step 3](docs/img/pat3.png)

### 2. Choose an LLM provider

By default the application uses OpenAI. Follow the steps below to obtain an API key if you want to keep using the hosted
OpenAI service.

- Sign up for an account by going to the OpenAI website (https://platform.openai.com)
- Once an account is created, visit the API keys page at https://platform.openai.com/account/api-keys.
- Create a new key by clicking the "Create new secret key" button.

When an API key is created you'll be able to copy the secret key and use it.

![OpenAI screenshot](docs/img/openai-key.png)

Note: OpenAI currently provides 5$ free credits for 3 months which is great since you won’t have to provide your
payment details to begin interacting with the API for the first time.

After that you have to enable billing in your account.

Tip: Make sure to set budget limits to prevent suprises at the end of the month.

If you prefer to use a self-hosted model, install [Ollama](https://ollama.com) on a machine you control and pull your
preferred model (for example `gpt-oss:20b`). Set the environment variable `LLM_PROVIDER=ollama` and optionally adjust
`OLLAMA_URL` (defaults to `http://localhost:11434`) and `OLLAMA_MODEL` (defaults to `gpt-oss:20b`).

### 3. Start the application via Docker

#### 3.1 Docker Compose

Create a new file `docker-compose.yml` with this content (or add to existing docker-compose file):

```yaml
version: '3.3'

services:
  categorizer:
    image: ghcr.io/bahuma20/firefly-iii-ai-categorize:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      FIREFLY_URL: "https://firefly.example.com"
      FIREFLY_PERSONAL_TOKEN: "eyabc123..."
      OPENAI_API_KEY: "sk-abc123..."
#     Uncomment the lines below to use a self-hosted Ollama instance instead of OpenAI
#     LLM_PROVIDER: "ollama"
#     OLLAMA_URL: "http://ollama:11434"
#     OLLAMA_MODEL: "gpt-oss:20b"
```

Make sure to set the environment variables correctly.

Run `docker-compose up -d`.

Now the application is running and accessible at port 3000.

#### 3.2 Manually via Docker

Run this Docker command to start the application container. Edit the environment variables to match the credentials
created before.

```shell
docker run -d \
-p 3000:3000 \
-e FIREFLY_URL=https://firefly.example.com \
-e FIREFLY_PERSONAL_TOKEN=eyabc123... \
-e OPENAI_API_KEY=sk-abc123... \
ghcr.io/bahuma20/firefly-iii-ai-categorize:latest
```

### 4. Set up the webhook

After starting your container, you have to set up the webhook in Firefly that will automatically trigger the
categorization everytime a new transaction comes in.

- Login to your Firefly instance
- In the sidebar go to "Automation" > "Webhooks"
- Click "Create new webhook"
- Give the webhook a title. For example "AI Categorizer"
- Set "Trigger" to "After transaction creation" (should be the default)
- Set "Response" to "Transaction details" (should be the default)
- Set "Delivery" to "JSON" (should be the default)
- Set "URL" to the URL where the application is reachable + "/webhook". For example if you are using docker-compose your
  URL could look like this: `http://categorizer:3000/webhook`
- Click "Submit"

![Step 1](docs/img/webhook1.png)
![Step 2](docs/img/webhook2.png)
![Step 3](docs/img/webhook3.png)

Now you are ready and every new withdrawal transaction should be automatically categorized by OpenAI.

## User Interface

The application comes with a minimal UI that allows you to monitor the classification queue and see the OpenAI prompts
and responses. This UI is disabled by default.

To enable this UI set the environment variable `ENABLE_UI` to `true`.

After a restart of the application the UI can be accessed at `http://localhost:3000/` (or any other URL that allows you
to reach the container).

## Adjust Tag name

The application automatically sets the tag "AI categorized" on every transaction that was processed and a category could
be guessed.

You can configure the name of this tag by setting the environment variable `FIREFLY_TAG` accordingly.

## Running on a different port

If you have to run the application on a different port than the default port `3000` set the environment variable `PORT`.

## Full list of environment variables

- `FIREFLY_URL`: The URL to your Firefly III instance. Example: `https://firefly.example.com`. (required)
- `FIREFLY_PERSONAL_TOKEN`: A Firefly III Personal Access Token. (required)
- `OPENAI_API_KEY`: The OpenAI API Key to authenticate against OpenAI. (Required when `LLM_PROVIDER=openai`)
- `LLM_PROVIDER`: Which LLM backend to use. Supported values: `openai` (default) or `ollama`.
- `OLLAMA_URL`: Base URL of the Ollama service when `LLM_PROVIDER=ollama`. (Default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model name to use with Ollama when `LLM_PROVIDER=ollama`. (Default: `gpt-oss:20b`)
- `ENABLE_UI`: If the user interface should be enabled. (Default: `false`)
- `FIREFLY_TAG`: The tag to assign to the processed transactions. (Default: `AI categorized`)
- `PORT`: The port where the application listens. (Default: `3000`)
