<h1 align="center">
supesquire
</h1>


# Overview

Supesquire is a `Next.js` application powered by OpenAI and supabase. It is well suited for chatting with your PDF documents in realtime. The application uses OpenAI's `gpt-3.5-turbo` model to generate contextually relevant answers to the questions asked by the user about the document. The application uses supabase for user authentication, storing the PDF document, persisting the document history, and all the chat records in the Database. The application uses langchain to extract textual content from the PDF document and generate tailored prompts for document Q&A

> The entire project is built with JS alone

# Stack

- **Supabase**: User authentication, storing the PDF document, realtime communication, persisting the document history and all the chat records in the Database
- **langchain**: Extract textual content from the PDF document and generate tailored prompts for document questions & answering
- **Next.js**: UI and Backend

![263046796-05a3d5d9-35d9-4442-9055-e0de605fb2ad](https://github.com/rickleibow/supesquire/assets/116029406/2b90de48-4002-4f39-9d9d-071da40ccece)


# Supabase setup

- Create a supabase project
- With supabase [RLS](https://supabase.com/docs/guides/auth/row-level-security) enabled, the application relies on supabase authentication. Ensure that you create a [new user in your supabase project](https://supabase.com/docs/guides/auth) with a valid email ID and a password to access this application
- The [supabase.sql](supabase.sql) has the queries to create the tables and storage bucket required for the application. Execute the queries on supabase's SQL editor to set up all the requirements for this application

# Local setup

- Clone the repo
- Install the dependencies using `yarn`
- Generate an API key for accessing the [OpenAI API](https://platform.openai.com/account/api-keys)
- Create a `.env.local` file in the root of the project and add the following environment variables

```
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_API_KEY=<supabase_api_key>
NEXT_PUBLIC_SUPABASE_BUCKET=<supabase_bucket>
NEXT_PUBLIC_SUPABASE_DOCUMENTS_TABLE=<supabase_documents_table>
NEXT_PUBLIC_SUPABASE_CHAT_RECORDS_TABLE=<supabase_chat_records_table>
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_API_KEY=<supabase_api_key>
NEXT_PUBLIC_SUPABASE_BUCKET=<supabase_bucket>

NEXT_PUBLIC_OPENAI_API_KEY=<openai_api_key>
```

- To start the application, run `yarn dev`

# Docker setup

The project includes a [Dockerfile](Dockerfile) to make the setup easier. Build the image and use the env variables/file to run the container

```shell
docker build -t <label>:<version> .

docker run -p 3000:3000 --env-file .env <label>:<version>
```

## Messaging tips

- To get the resutls as a bulleted list, prefix your message with `List the <something>`

```
context: Chatting with the specification document of a bike
```

**Q: List the key differences between all the variants**

**A:**

![263039688-1631d98a-0704-48d3-9029-f5d50617106e](https://github.com/rickleibow/supesquire/assets/116029406/d37467b5-9875-4461-8538-de3f84fa6da8)

- The app supports syntax highlighting for code snippets. If the document includes code snippets, then you can make the model return it in a formatted

```
context: Chatting with a book that covers the concepts of Golang
```

**Q: How to reverse a string and show the code for the same**

**A:**

![263047691-9bc052ab-9885-495d-bf0d-f5289ce68d14](https://github.com/rickleibow/supesquire/assets/116029406/965c54ed-5df0-483f-9145-e5b5ec863183)

