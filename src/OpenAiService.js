import {Configuration, OpenAIApi} from "openai";
import {getConfigVariable} from "./util.js";

export default class OpenAiService {
    #openAi;
    #model = "gpt-5";

    constructor() {
        const apiKey = getConfigVariable("OPENAI_API_KEY")

        const configuration = new Configuration({
            apiKey
        });

        this.#openAi = new OpenAIApi(configuration)
    }

    async classify(categories, destinationName, description) {
        try {
            const prompt = this.#generatePrompt(categories, destinationName, description);

            const response = await this.#openAi.createCompletion({
                model: this.#model,
                prompt
            });

            let guess = response.data.choices[0].text;
            guess = guess.replace("\n", "");
            guess = guess.trim();

            if (categories.indexOf(guess) === -1) {
                console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${prompt}
                OpenAIs guess: ${guess}`)
                return null;
            }

            return {
                prompt,
                response: response.data.choices[0].text,
                category: guess
            };

        } catch (error) {
            if (error.response) {
                console.error(error.response.status);
                console.error(error.response.data);
                throw new OpenAiException(error.status, error.response, error.response.data);
            } else {
                console.error(error.message);
                throw new OpenAiException(null, null, error.message);
            }
        }
    }

    #generatePrompt(categories, destinationName, description) {
        return `Given i want to categorize transactions on my bank account into this categories: ${categories.join(", ")}. 
When categorizing, focus primarily on the merchant name and known businesses.
Avoid categorizing based on payment methods like "Apple Pay" or terms like "Card sequence"
Based on this, in which category would the following transaction fall: "${description}" from "${destinationName}"
Just output the name of the correct category.`;
    }
}

class OpenAiException extends Error {
    code;
    response;
    body;

    constructor(statusCode, response, body) {
        super(`Error while communicating with OpenAI: ${statusCode} - ${body}`);

        this.code = statusCode;
        this.response = response;
        this.body = body;
    }
}