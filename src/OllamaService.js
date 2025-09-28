import {getConfigVariable} from "./util.js";

export default class OllamaService {
    #baseUrl;
    #model;

    constructor() {
        this.#baseUrl = getConfigVariable("OLLAMA_URL", "http://localhost:11434");
        this.#model = getConfigVariable("OLLAMA_MODEL", "gpt-oss:20b");
    }

    async classify(categories, transaction) {
        const prompt = this.#generatePrompt(categories, transaction);

        try {
            const response = await fetch(`${this.#baseUrl}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.#model,
                    prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new OllamaException(response.status, response, await response.text());
            }

            const data = await response.json();
            const rawResponse = data.response ?? "";
            const guess = this.#extractCategory(rawResponse, categories);

            if (!guess) {
                console.warn(`Ollama could not classify the transaction.
                Prompt: ${prompt}
                Ollama response: ${rawResponse}`)
            }

            return {
                prompt,
                response: rawResponse,
                category: guess
            };
        } catch (error) {
            if (error instanceof OllamaException) {
                throw error;
            }

            console.error(error.message);
            throw new OllamaException(null, null, error.message);
        }
    }

    #generatePrompt(categories, transaction) {
        const details = this.#formatTransactionDetails(transaction);
        return `You are an assistant that classifies personal finance transactions.
Available categories: ${categories.join(", ")}.
The transaction details are:
${details}
Return only the single category name that best fits.`;
    }

    #formatTransactionDetails(transaction) {
        const lines = [];

        const simpleFields = {
            "Description": transaction.description,
            "Destination": transaction.destination_name,
            "Source": transaction.source_name,
            "Amount": transaction.amount,
            "Currency": transaction.currency_code || transaction.foreign_currency_code,
            "Foreign amount": transaction.foreign_amount,
            "Date": transaction.date,
            "Budget": transaction.budget_name,
            "Bill": transaction.bill_name,
            "Notes": transaction.notes,
            "Payment reference": transaction.payment_reference,
        };

        Object.entries(simpleFields).forEach(([label, value]) => {
            if (value) {
                lines.push(`${label}: ${value}`);
            }
        });

        if (transaction.tags && transaction.tags.length > 0) {
            lines.push(`Tags: ${transaction.tags.join(", ")}`);
        }

        if (transaction.category_name) {
            lines.push(`Current category name: ${transaction.category_name}`);
        }

        return lines.join("\n");
    }

    #extractCategory(rawResponse, categories) {
        if (!rawResponse) {
            return null;
        }

        const normalizedCategories = categories.map(category => category.toLowerCase());

        const lines = rawResponse.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

        for (const line of lines) {
            const normalizedLine = line.toLowerCase();
            const exactIndex = normalizedCategories.indexOf(normalizedLine);
            if (exactIndex !== -1) {
                return categories[exactIndex];
            }

            const containedIndex = normalizedCategories.findIndex(category => normalizedLine.includes(category));
            if (containedIndex !== -1) {
                return categories[containedIndex];
            }
        }

        // fallback: try to match first word ignoring punctuation
        const cleaned = lines[0]?.replace(/[^\w\s]/g, "").toLowerCase();
        if (!cleaned) {
            return null;
        }

        const fallbackIndex = normalizedCategories.indexOf(cleaned);
        if (fallbackIndex !== -1) {
            return categories[fallbackIndex];
        }

        const containsFallbackIndex = normalizedCategories.findIndex(category => cleaned.includes(category));
        if (containsFallbackIndex !== -1) {
            return categories[containsFallbackIndex];
        }

        return null;
    }
}

class OllamaException extends Error {
    code;
    response;
    body;

    constructor(statusCode, response, body) {
        super(`Error while communicating with Ollama: ${statusCode} - ${body}`);

        this.code = statusCode;
        this.response = response;
        this.body = body;
    }
}
