// ==UserScript==
// @name         AI Web Activity Monitor
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Respond to site visits with AI-generated messages using Azure Speech Services
// @author       Dexin Yang
// @match        *://*/*                    // Run on all websites
// @grant        GM_xmlhttpRequest          // Allow making HTTP requests to APIs
// @grant        GM_getValue                // Allow reading stored values
// @grant        GM_setValue                // Allow storing values
// ==/UserScript==

(function() {
    'use strict'; // Enable strict mode for better error handling

    // ===========================================
    // CONFIGURATION - Edit these values with your actual API keys
    // ===========================================
    const CONFIG = {
        // Azure Speech Services Configuration
        // This handles converting text to speech (TTS) - the voice you hear
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

        // Azure OpenAI Configuration
        // This handles generating the AI responses (the text content)
        azureOpenAI: {
            apiKey: 'YOUR_AZURE_OPENAI_API_KEY_HERE', // Replace with your Azure OpenAI API key
            endpoint: 'YOUR_AZURE_OPENAI_ENDPOINT_HERE', // Replace with your Azure OpenAI endpoint
            deploymentName: 'gpt-4', // Your deployment name
            apiVersion: '2024-02-15-preview', // API version to use
            maxTokens: 107, // Maximum length of AI response
            temperature: 1, // Creativity level (0 = deterministic, 2 = very creative)
            topP: 1, // Nucleus sampling parameter
            frequencyPenalty: 0, // Reduce repetition (0 = no penalty, 1 = max penalty)
            presencePenalty: 0 // Encourage new topics (0 = no penalty, 1 = max penalty)
        },

        // Website monitoring configuration
        // Define which websites to monitor and what messages to send
        websites: [
            {
                domain: 'youtube.com', // Website domain to monitor
                message: 'I am watching a youtube video', // Message sent to AI when this site is visited
                role: 'user', // Role for the AI conversation
                enabled: true // Whether this website is currently being monitored
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
                enabled: true
            },
            {
                domain: 'twitter.com',
                message: 'I am scrolling through twitter',
                role: 'user',
                enabled: true
            },
            {
                domain: 'github.com',
                message: 'I am coding on github',
                role: 'user',
                enabled: true
            }
        ],

        // AI System Prompt Configuration
        // This defines the personality and behavior of the AI boss
        systemPrompt: {
            role: "system", // This is a system message that sets the AI's behavior
            content: `#Role:
Web Activity Monitor - Your Digital Boss
##Communication Style：
You are a professional, firm but fair digital boss who monitors web activity and provides guidance. You speak with authority and professionalism, using a tone that's encouraging yet direct, and providing constructive feedback.
##Requirement：
1.When the user says I am watching a youtube video, firmly but professionally redirect them to more productive activities. Acknowledge that breaks are important but remind them of their goals. At least 35 words.
2.When the user says I am researching AI on huggingface, praise them for their commitment to learning and professional development. Encourage continued growth. At least 35 words.
3.When the user says I am browsing reddit, gently but firmly remind them that social media can be a time sink and suggest focusing on priorities. At least 35 words.
4.When the user says I am scrolling through twitter, remind them that while staying informed is good, excessive social media browsing can impact productivity. At least 35 words.
5.When the user says I am coding on github, enthusiastically praise them for their dedication to development work and encourage them to keep building great things. At least 35 words.`
        },

        // General settings
        // Control the overall behavior of the script
        settings: {
            // Prevent multiple simultaneous voice triggers
            preventMultipleVoices: true, // If true, only one voice response at a time
            // Delay before checking URL (milliseconds)
            checkDelay: 1000, // Wait 1 second before checking if we're on a monitored site
            // Enable console logging
            enableLogging: true // If true, shows debug messages in browser console
        }
    };

    // ===========================================
    // GLOBAL VARIABLES
    // ===========================================
    
    // Use Promise to ensure voice is triggered only once
    // This prevents multiple overlapping voice responses
    let voicePromise = null;

    // Store the message and role to send to the AI
    let messageToSend = '';
    let roleToSend = '';

    // ===========================================
    // UTILITY FUNCTIONS
    // ===========================================
    
    // Logging function - only logs if logging is enabled in config
    function log(message) {
        if (CONFIG.settings.enableLogging) {
            console.log('[AI Web Activity Monitor]', message);
        }
    }

    // ===========================================
    // WEBSITE MONITORING FUNCTIONS
    // ===========================================
    
    // Check if the current URL matches any of the monitored websites
    function checkCurrentUrl() {
        const currentUrl = window.location.href;
        log(`Checking URL: ${currentUrl}`);
        
        // Loop through all configured websites
        for (const website of CONFIG.websites) {
            // Check if website is enabled and URL contains the domain
            if (website.enabled && currentUrl.includes(website.domain)) {
                messageToSend = website.message; // Set the message to send to AI
                roleToSend = website.role; // Set the role for the AI conversation
                log(`Matched website: ${website.domain}`);
                break; // Stop checking once we find a match
            }
        }
    }

    // ===========================================
    // AI API FUNCTIONS
    // ===========================================
    
    // Function to call Azure OpenAI Chat API
    // This generates the AI boss's response based on the website visited
    function callAzureOpenAIChat(role, message) {
        // Check if we should prevent multiple simultaneous voice responses
        if (CONFIG.settings.preventMultipleVoices && voicePromise) {
            log('Voice already playing, skipping...');
            return voicePromise; // Return existing promise if voice is already playing
        }

        // Create a new promise for this AI request
        voicePromise = new Promise((resolve, reject) => {
            log('Calling Azure OpenAI API...');
            
            // Construct the Azure OpenAI endpoint URL
            const endpoint = `${CONFIG.azureOpenAI.endpoint}/openai/deployments/${CONFIG.azureOpenAI.deploymentName}/chat/completions?api-version=${CONFIG.azureOpenAI.apiVersion}`;
            
            // Make HTTP request to Azure OpenAI
            GM_xmlhttpRequest({
                method: "POST",
                url: endpoint,
                headers: {
                    "api-key": CONFIG.azureOpenAI.apiKey, // Use API key for authentication
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "messages": [
                        CONFIG.systemPrompt, // Include the system prompt (boss personality)
                        {
                            "role": role, // User role
                            "content": message // The message about what website they're on
                        }
                    ],
                    "temperature": CONFIG.azureOpenAI.temperature, // AI creativity level
                    "max_tokens": CONFIG.azureOpenAI.maxTokens, // Maximum response length
                    "top_p": CONFIG.azureOpenAI.topP, // Nucleus sampling
                    "frequency_penalty": CONFIG.azureOpenAI.frequencyPenalty, // Reduce repetition
                    "presence_penalty": CONFIG.azureOpenAI.presencePenalty // Encourage new topics
                }),
                onload: function(response) {
                    try {
                        // Parse the AI response
                        const data = JSON.parse(response.responseText);
                        const replyText = data.choices[0].message.content;
                        log(`AI Response: ${replyText}`);
                        // Convert the text response to speech
                        convertTextToSpeech(replyText).then(resolve).catch(reject);
                    } catch (e) {
                        log(`Error parsing Azure OpenAI response: ${e.message}`);
                        reject(e);
                    }
                },
                onerror: function(error) {
                    log(`Azure OpenAI API error: ${error}`);
                    reject(error);
                }
            });
        });

        return voicePromise;
    }

    // ===========================================
    // TEXT-TO-SPEECH FUNCTIONS
    // ===========================================
    
    // Function to call Azure Speech Services TTS API
    // This converts the AI's text response into spoken audio
    function convertTextToSpeech(text) {
        return new Promise((resolve, reject) => {
            log('Converting text to speech with Azure...');
            
            // Azure Speech Services endpoint
            const azureEndpoint = `https://${CONFIG.azure.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
            
            // Convert text to SSML (Speech Synthesis Markup Language) for better voice control
            // SSML allows us to control voice speed, pitch, and other characteristics
            const ssml = `
                <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${CONFIG.azure.voice.language}'>
                    <voice name='${CONFIG.azure.voice.name}'>
                        <prosody rate='${CONFIG.azure.voice.rate}' pitch='${CONFIG.azure.voice.pitch}'>
                            ${text}
                        </prosody>
                    </voice>
                </speak>
            `;

            // Make HTTP request to Azure Speech Services
            GM_xmlhttpRequest({
                method: "POST",
                url: azureEndpoint,
                headers: {
                    "Ocp-Apim-Subscription-Key": CONFIG.azure.subscriptionKey, // Azure API key
                    "Content-Type": "application/ssml+xml", // Tell Azure we're sending SSML
                    "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3" // Audio format
                },
                data: ssml, // Send the SSML text
                responseType: 'blob', // Expect binary audio data back
                onload: function(response) {
                    try {
                        // Play the audio directly using Web Audio API
                        const audioBlob = new Blob([response.response], { type: 'audio/mpeg' });
                        const audioUrl = URL.createObjectURL(audioBlob); // Create a URL for the audio
                        const audio = new Audio(audioUrl); // Create an Audio object
                        
                        // When audio finishes playing, clean up and resolve
                        audio.onended = () => {
                            URL.revokeObjectURL(audioUrl); // Free up memory
                            log('Audio playback completed');
                            resolve(); // Signal that we're done
                        };
                        
                        // Handle audio playback errors
                        audio.onerror = (error) => {
                            log(`Audio playback error: ${error}`);
                            reject(error);
                        };
                        
                        log('Starting audio playback...');
                        audio.play(); // Start playing the audio
                    } catch (e) {
                        log(`Error processing audio: ${e.message}`);
                        reject(e);
                    }
                },
                onerror: function(error) {
                    log(`Azure TTS API error: ${error}`);
                    reject(error);
                }
            });
        });
    }

    // ===========================================
    // PAGE MONITORING AND INITIALIZATION
    // ===========================================
    
    // MutationObserver to detect page changes
    // This watches for changes in the DOM (like when you navigate to a new page)
    const observer = new MutationObserver((mutations) => {
        // Only trigger if no voice is currently playing (or if multiple voices are allowed)
        if (!voicePromise || !CONFIG.settings.preventMultipleVoices) {
            setTimeout(() => {
                checkCurrentUrl(); // Check if we're on a monitored website
                if (messageToSend !== '') {
                    callAzureOpenAIChat(roleToSend, messageToSend); // Generate and play AI response
                    observer.disconnect(); // Stop observing after triggering once
                }
            }, CONFIG.settings.checkDelay); // Wait for the configured delay
        }
    });

    // Start observing the page for changes
    observer.observe(document.body, {
        childList: true, // Watch for new child elements
        subtree: true   // Watch the entire DOM tree
    });

    // Initial check when the script first loads
    // This handles the case where you're already on a monitored website when the page loads
    setTimeout(() => {
        checkCurrentUrl();
        if (messageToSend !== '') {
            callAzureOpenAIChat(roleToSend, messageToSend);
        }
    }, CONFIG.settings.checkDelay);

    // Log that the script has been initialized
    log('AI Web Activity Monitor initialized');
})();