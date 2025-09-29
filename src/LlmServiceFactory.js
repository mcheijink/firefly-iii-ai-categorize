import {getConfigVariable} from "./util.js";
import OpenAiService from "./OpenAiService.js";
import OllamaService from "./OllamaService.js";

export default function createLlmService() {
    const provider = getConfigVariable("LLM_PROVIDER", "openai").toLowerCase();

    switch (provider) {
        case "ollama":
            return new OllamaService();
        case "openai":
        default:
            return new OpenAiService();
    }
}
