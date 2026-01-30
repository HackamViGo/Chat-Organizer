/**
 * Unit Test for Schema Validation
 * Tests the core validation logic for BrainBox conversations
 */

const assert = require('assert');

// Since our original files use ES Modules (import/export), 
// we will simulate the validation logic here to demonstrate the Unit Test concept.
// In a real project with Jest/Vitest, we would import validateConversation directly.

const PLATFORMS = {
    CHATGPT: 'chatgpt',
    CLAUDE: 'claude',
    GEMINI: 'gemini'
};

function validateConversation(conversation) {
    if (!conversation) return { valid: false, error: 'Conversation object is null' };
    const requiredFields = ['id', 'platform', 'title', 'messages', 'created_at'];
    for (const field of requiredFields) {
        if (!conversation[field]) {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }
    if (!Array.isArray(conversation.messages)) {
        return { valid: false, error: 'messages must be an array' };
    }
    if (!Object.values(PLATFORMS).includes(conversation.platform)) {
        return { valid: false, error: `Invalid platform: ${conversation.platform}` };
    }
    return { valid: true, error: null };
}

// THE TESTS
console.log('🧪 Running Unit Tests: Schema Validation');

// test 1: Valid conversation
const validChat = {
    id: '123',
    platform: 'gemini',
    title: 'Test Chat',
    messages: [],
    created_at: Date.now()
};
const result1 = validateConversation(validChat);
assert.strictEqual(result1.valid, true, 'Should be valid');
console.log('✅ Passed: Valid conversation');

// test 2: Missing field
const invalidChat = {
    id: '123',
    platform: 'gemini'
    // missing title, messages, created_at
};
const result2 = validateConversation(invalidChat);
assert.strictEqual(result2.valid, false, 'Should be invalid');
assert.ok(result2.error.includes('Missing required field'), 'Should specify missing field');
console.log('✅ Passed: Missing field detection');

// test 3: Invalid platform
const wrongPlatform = { ...validChat, platform: 'skynet' };
const result3 = validateConversation(wrongPlatform);
assert.strictEqual(result3.valid, false, 'Should be invalid');
assert.ok(result3.error.includes('Invalid platform'), 'Should detect invalid platform');
console.log('✅ Passed: Invalid platform detection');

console.log('\n✨ All Unit Tests Passed!\n');
