import * as FileSystem from 'expo-file-system';

export const uploadPlantImageAsync = async (uri, userId) => {
  if (!uri) return null;
  
  try {
    // Generate a unique filename using timestamp
    const fileName = `plant_${Date.now()}.jpg`;
    // Create the destination path in the app's document directory
    const destPath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Copy the file from the temporary cache directory (ImagePicker) to the persistent doc directory
    await FileSystem.copyAsync({
      from: uri,
      to: destPath
    });

    // Return the local persistent URI to be saved in Firestore
    return destPath;
  } catch (error) {
    console.error('Error saving image locally: ', error);
    throw error;
  }
};
