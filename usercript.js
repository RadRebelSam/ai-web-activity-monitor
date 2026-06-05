// ==UserScript==
// @name         AI Web Activity Monitor
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Respond to site visits with AI-generated messages using Azure Speech Services
// @author       Dexin Yang
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
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
Web Activity Monitor - Your Sassy Digital Sidekick
##Communication Style：
You are a hilariously sarcastic, witty digital companion who monitors web activity with humor and charm. You speak like a sassy best friend who's not afraid to call out procrastination with clever jokes, puns, and playful teasing. You're encouraging but with a healthy dose of humor and wit.
##Requirement：
1.When the user says I am watching a youtube video, respond with playful sarcasm about their "productivity" while acknowledging breaks are good. Use humor to gently redirect them. At least 35 words.
2.When the user says I am researching AI on huggingface, celebrate their learning with enthusiasm and maybe a nerdy joke about AI. Encourage their growth with humor. At least 35 words.
3.When the user says I am browsing reddit, use witty commentary about the rabbit hole of social media and suggest focusing on priorities with humor. At least 35 words.
4.When the user says I am scrolling through twitter, make a clever joke about doom-scrolling or staying "informed" while gently nudging them toward productivity. At least 35 words.
5.When the user says I am coding on github, cheer them on with excitement and maybe a programming pun or joke about their coding adventures. At least 35 words.`
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

    // Pendo track event helper - safely calls pendo.track() if Pendo is available
    function pendoTrack(eventName, properties) {
        try {
            if (typeof pendo !== 'undefined' && typeof pendo.track === 'function') {
                pendo.track(eventName, properties);
            }
        } catch (e) {
            log(`Pendo tracking error: ${e.message}`);
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
                pendoTrack('website_activity_detected', {
                    matched_domain: website.domain,
                    user_message: website.message,
                    user_role: website.role,
                    current_url: currentUrl,
                    timestamp: new Date().toISOString()
                });
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
            pendoTrack('voice_skipped_duplicate', {
                matched_domain: messageToSend,
                prevent_multiple_voices: true
            });
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
                        pendoTrack('ai_response_generated', {
                            matched_domain: messageToSend,
                            deployment_name: CONFIG.azureOpenAI.deploymentName,
                            temperature: CONFIG.azureOpenAI.temperature,
                            max_tokens: CONFIG.azureOpenAI.maxTokens,
                            top_p: CONFIG.azureOpenAI.topP,
                            frequency_penalty: CONFIG.azureOpenAI.frequencyPenalty,
                            presence_penalty: CONFIG.azureOpenAI.presencePenalty,
                            response_length: replyText.length,
                            api_version: CONFIG.azureOpenAI.apiVersion
                        });
                        // Convert the text response to speech
                        convertTextToSpeech(replyText).then(resolve).catch(reject);
                    } catch (e) {
                        log(`Error parsing Azure OpenAI response: ${e.message}`);
                        pendoTrack('ai_response_error', {
                            error_message: e.message,
                            error_type: 'parse_error',
                            matched_domain: messageToSend,
                            deployment_name: CONFIG.azureOpenAI.deploymentName,
                            api_version: CONFIG.azureOpenAI.apiVersion
                        });
                        reject(e);
                    }
                },
                onerror: function(error) {
                    log(`Azure OpenAI API error: ${error}`);
                    pendoTrack('ai_response_error', {
                        error_message: String(error),
                        error_type: 'api_error',
                        matched_domain: messageToSend,
                        deployment_name: CONFIG.azureOpenAI.deploymentName,
                        api_version: CONFIG.azureOpenAI.apiVersion
                    });
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
                        pendoTrack('tts_conversion_completed', {
                            voice_name: CONFIG.azure.voice.name,
                            voice_language: CONFIG.azure.voice.language,
                            speech_rate: CONFIG.azure.voice.rate,
                            speech_pitch: CONFIG.azure.voice.pitch,
                            azure_region: CONFIG.azure.region,
                            text_length: text.length,
                            output_format: 'audio-16khz-128kbitrate-mono-mp3'
                        });

                        // When audio finishes playing, clean up and resolve
                        audio.onended = () => {
                            URL.revokeObjectURL(audioUrl); // Free up memory
                            log('Audio playback completed');
                            pendoTrack('tts_playback_completed', {
                                voice_name: CONFIG.azure.voice.name,
                                voice_language: CONFIG.azure.voice.language,
                                speech_rate: CONFIG.azure.voice.rate,
                                speech_pitch: CONFIG.azure.voice.pitch,
                                azure_region: CONFIG.azure.region,
                                text_length: text.length,
                                matched_domain: messageToSend
                            });
                            resolve(); // Signal that we're done
                        };

                        // Handle audio playback errors
                        audio.onerror = (error) => {
                            log(`Audio playback error: ${error}`);
                            pendoTrack('tts_conversion_error', {
                                error_message: String(error),
                                error_type: 'playback_error',
                                voice_name: CONFIG.azure.voice.name,
                                azure_region: CONFIG.azure.region,
                                text_length: text.length
                            });
                            reject(error);
                        };

                        log('Starting audio playback...');
                        audio.play(); // Start playing the audio
                    } catch (e) {
                        log(`Error processing audio: ${e.message}`);
                        pendoTrack('tts_conversion_error', {
                            error_message: e.message,
                            error_type: 'processing_error',
                            voice_name: CONFIG.azure.voice.name,
                            azure_region: CONFIG.azure.region,
                            text_length: text.length
                        });
                        reject(e);
                    }
                },
                onerror: function(error) {
                    log(`Azure TTS API error: ${error}`);
                    pendoTrack('tts_conversion_error', {
                        error_message: String(error),
                        error_type: 'api_error',
                        voice_name: CONFIG.azure.voice.name,
                        azure_region: CONFIG.azure.region,
                        text_length: text.length
                    });
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
    pendoTrack('monitor_initialized', {
        monitored_website_count: CONFIG.websites.length,
        enabled_website_count: CONFIG.websites.filter(w => w.enabled).length,
        prevent_multiple_voices: CONFIG.settings.preventMultipleVoices,
        check_delay: CONFIG.settings.checkDelay,
        logging_enabled: CONFIG.settings.enableLogging
    });
})();
