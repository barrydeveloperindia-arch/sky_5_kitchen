import { execute } from './command_monitor.js';

// Example: "Update Menu" or "Process Order" command
async function runDemo() {
    console.log("Starting Demo Command Execution...");

    await execute('Update_Menu_Item', async () => {
        // Simulate some work
        console.log("WORKER: Updating menu item 'Spicy Burger'...");
        await new Promise(resolve => setTimeout(resolve, 500));
        // Return the payload data
        return { itemId: 101, name: "Spicy Burger", price: 12.99, updatedBy: "Admin" };
    });

    console.log("\n-----------------------------------");
    console.log("Test Complete. Check 'logs/' folder and 'automation/db.json'.");
}

runDemo();
