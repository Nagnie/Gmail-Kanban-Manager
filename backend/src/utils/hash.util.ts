import * as bcrypt from 'bcrypt';

const saltRounds = 10;

export const hashText = async (plainText: string): Promise<string | null> => {
  try {
    if (!plainText || plainText.trim() === '') {
      console.error('Input text for hashing is empty or invalid.');
      return null;
    }

    return await bcrypt.hash(plainText, saltRounds);
  } catch (error) {
    console.error('Error during text hashing:', error);
    return null;
  }
};

export const compareHashedText = async (
  plainText: string,
  hashedText: string,
): Promise<boolean> => {
  try {
    if (
      !plainText ||
      plainText.trim() === '' ||
      !hashedText ||
      hashedText.trim() === ''
    ) {
      return false;
    }

    return await bcrypt.compare(plainText, hashedText);
  } catch (error) {
    console.error('Error during hash comparison:', error);
    return false;
  }
};
