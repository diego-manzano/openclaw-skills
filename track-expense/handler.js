const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = "31e78b9e-154e-803b-b738-c21b57163bf5";

const CATEGORIES = ["food", "other", "health and wellness", "utilities", "shopping", "transport"];

export default async function handler(event) {
  const { content, files, session } = event.context;

  // Get image description if image uploaded
  let description = content.trim();

  if (files && files.length > 0) {
    // Try to get image caption/description
    const image = files[0];
    if (image.description) {
      description = image.description.trim();
    }
  }

  // Parse command: /track-expense [amount] [description] [category] [merchant]
  const parts = description.split(/\s+/);

  if (parts.length < 3) {
    return {
      messages: [
        `Usage: /track-expense [amount] [description] [category] [merchant]\n\n` +
        `Categories: ${CATEGORIES.join(", ")}\n\n` +
        `Description can be provided in text or via image caption`
      ]
    };
  }

  const amount = parseFloat(parts[0]);
  const descriptionText = parts.slice(1, -2).join(" ");
  const category = parts[parts.length - 2];
  const merchant = parts[parts.length - 1];

  // Validate category
  if (!CATEGORIES.includes(category.toLowerCase())) {
    return {
      messages: [
        `Invalid category. Use one of: ${CATEGORIES.join(", ")}`
      ]
    };
  }

  try {
    // Create Notion page
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties: {
          Description: { title: [{ text: { content: descriptionText } }] },
          Amount: { number: amount },
          Date: { date: { start: new Date().toISOString().split('T')[0] } },
          Category: { select: { name: category } },
          Merchant: { rich_text: [{ text: { content: merchant } }] }
        }
      })
    });

    if (response.status === 200) {
      return {
        messages: [
          `✅ Tracked: ${descriptionText} - ₱${amount.toFixed(2)}`
        ]
      };
    } else {
      const error = await response.text();
      return {
        messages: [
          `❌ Failed to track expense: ${error}`
        ]
      };
    }
  } catch (error) {
    return {
      messages: [
        `❌ Error: ${error.message}`
      ]
    };
  }
}
