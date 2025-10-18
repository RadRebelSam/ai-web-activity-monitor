# AI Web Activity Monitor

A Tampermonkey userscript that monitors your web browsing activity and responds with AI-generated messages and voice feedback using Azure Speech Services.

## Features

- 🎯 **Website Monitoring**: Detects visits to specific websites and triggers custom responses
- 🤖 **AI-Powered Responses**: Uses OpenAI's GPT models to generate contextual messages
- 🔊 **Azure Speech Services**: High-quality text-to-speech with multiple voice options
- ⚙️ **Fully Configurable**: Easy-to-modify configuration file for all settings
- 🎭 **Sassy Sidekick Persona**: hilariously witty and sarcastic AI responses to keep you motivated with humor
- 🚫 **Smart Triggering**: Prevents multiple simultaneous voice responses

## Prerequisites

1. **Tampermonkey Browser Extension**
2. **Azure Speech Services Account**
3. **Azure OpenAI Service**

## Configuration

```javascript
const CONFIG = {
    azure: {
        subscriptionKey: 'YOUR_AZURE_SPEECH_KEY_HERE', // Replace with your Azure Speech Services key
        region: 'YOUR_AZURE_REGION_HERE', // Replace with your Azure region (e.g., 'eastus')
        voice: {
            name: 'en-US-AriaNeural', // Choose your preferred voice
            language: 'en-US',
            rate: '1.0', // Speech rate (0.5 = slow, 2.0 = fast)
            pitch: '0%'  // Voice pitch (-50% to +50%)
        }
    },
    azureOpenAI: {
        apiKey: 'YOUR_AZURE_OPENAI_API_KEY_HERE', // Replace with your Azure OpenAI API key
        endpoint: 'YOUR_AZURE_OPENAI_ENDPOINT_HERE', // Replace with your Azure OpenAI endpoint
        deploymentName: 'gpt-4', // Your deployment name
        // ... other settings
    }
    // ... rest of configuration
};
```
## Optional Configuration

### Voice Settings

```javascript
azure: {
    voice: {
        name: 'en-US-AriaNeural', // Available options:
        // - en-US-AriaNeural (Female, conversational)
        // - en-US-GuyNeural (Male, conversational)
        // - en-US-JennyNeural (Female, friendly)
        // - en-US-DavisNeural (Male, friendly)
        // - en-US-AmberNeural (Female, calm)
        // - en-US-AnaNeural (Female, young)
        // - en-US-AshleyNeural (Female, cheerful)
        // - en-US-BrandonNeural (Male, cheerful)
        // - en-US-ChristopherNeural (Male, calm)
        // - en-US-CoraNeural (Female, professional)
        // - en-US-ElizabethNeural (Female, professional)
        // - en-US-EricNeural (Male, professional)
        // - en-US-JacobNeural (Male, young)
        // - en-US-JaneNeural (Female, young)
        // - en-US-JasonNeural (Male, young)
        // - en-US-MichelleNeural (Female, young)
        // - en-US-MonicaNeural (Female, young)
        // - en-US-NancyNeural (Female, young)
        // - en-US-RogerNeural (Male, young)
        // - en-US-SaraNeural (Female, young)
        // - en-US-TonyNeural (Male, young)
        language: 'en-US',
        rate: '1.0',    // Speech rate (0.5 = slow, 2.0 = fast)
        pitch: '0%'     // Voice pitch (-50% to +50%)
    }
}
```

### Website Monitoring

```javascript
websites: [
    {
        domain: 'youtube.com',
        message: 'I am watching a youtube video',
        role: 'user',
        enabled: true
    },
    {
        domain: 'huggingface.co',
        message: 'I am learning AI on huggingface',
        role: 'user',
        enabled: true
    },
    {
        domain: 'reddit.com',
        message: 'I am browsing reddit',
        role: 'user',
        enabled: false
    }
    // Add more websites as needed
]
```

### AI Model Settings

```javascript
azureOpenAI: {
    apiKey: 'YOUR_AZURE_OPENAI_API_KEY_HERE',
    endpoint: 'YOUR_AZURE_OPENAI_ENDPOINT_HERE',
    deploymentName: 'gpt-4', // Your deployment name
    apiVersion: '2024-02-15-preview',
    maxTokens: 107,
    temperature: 1,        // Creativity (0 = deterministic, 2 = very creative)
    topP: 1,              // Nucleus sampling
    frequencyPenalty: 0,   // Reduce repetition
    presencePenalty: 0     // Encourage new topics
}
```

### General Settings

```javascript
settings: {
    preventMultipleVoices: true,  // Prevent overlapping voice responses
    checkDelay: 1000,            // Delay before checking URL (milliseconds)
    enableLogging: true          // Enable console logging for debugging
}
```

### Modifying AI Responses

Edit the `systemPrompt.content` in the CONFIG object to change how the AI responds to different activities. The current persona is a sassy, witty digital sidekick that uses humor and sarcasm to motivate you.

## Security Notes

- **API Keys**: Never share your API keys or commit them to version control
- **HTTPS**: The script only works on HTTPS websites for security
- **Permissions**: The script only requests necessary permissions (GM_xmlhttpRequest)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
