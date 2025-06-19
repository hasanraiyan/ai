const extractJson = (text) => {
  const match = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
  if (!match) return null;
  const jsonString = match[1] || match[2];
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
};


export  {extractJson};