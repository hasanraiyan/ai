// src/hooks/useCharacters.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultCharacters } from '../constants/characters';
import { systemLogger } from '../utils/logging';
import { LogCategory } from '../utils/logging';

const CHARACTERS_STORAGE_KEY = '@characters';

export function useCharacters() {
  const [characters, setCharacters] = useState([]);
  const [charactersReady, setCharactersReady] = useState(false);

  // This single, robust effect handles loading and initialization.
  useEffect(() => {
    const loadAndInitializeCharacters = async () => {
      try {
        const storedCharactersJSON = await AsyncStorage.getItem(CHARACTERS_STORAGE_KEY);
        
        if (storedCharactersJSON === null) {
          // --- SCENARIO 1: FIRST-TIME LAUNCH ---
          // No data in storage, so we seed the app with the default characters.
          if (__DEV__) systemLogger.debug(LogCategory.SYSTEM, "First launch: Seeding with default characters.");
          setCharacters(defaultCharacters);
        } else {
          // --- SCENARIO 2: EXISTING USER ---
          // Data exists, so we merge it with the latest defaults from the code.
          const storedCharacters = JSON.parse(storedCharactersJSON);
          
          // Get the latest default characters from the constants file.
          const latestDefaults = defaultCharacters;
          
          // Get all non-default (i.e., user-created) characters from storage.
          const userCreatedCharacters = storedCharacters.filter(c => !c.isDefault);
          
          // Combine them. The latest defaults from the code overwrite any old stored defaults,
          // and all user-created characters are preserved.
          const finalCharacterList = [...latestDefaults, ...userCreatedCharacters];
          
          setCharacters(finalCharacterList);
        }
      } catch (e) {
        systemLogger.warn(LogCategory.SYSTEM, 'Error loading or initializing characters, falling back to defaults', {
          error: e.message
        });
        // --- SCENARIO 3: ERROR FALLBACK ---
        // If anything goes wrong (e.g., corrupted data), start fresh with defaults.
        setCharacters(defaultCharacters);
      } finally {
        // Mark the characters as ready for the app to use.
        setCharactersReady(true);
      }
    };

    loadAndInitializeCharacters();
  }, []); // The empty dependency array `[]` ensures this runs only once on mount.

  // This effect saves the characters to storage whenever the list changes.
  useEffect(() => {
    // We only save after the initial load is complete to avoid race conditions.
    if (charactersReady) {
      AsyncStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    }
  }, [characters, charactersReady]);

  const createCharacter = useCallback((newCharacterData) => {
    const newCharacter = {
      ...newCharacterData,
      id: `user-${Date.now().toString()}`,
      isDefault: false, // User-created characters are never default.
    };
    setCharacters(prev => [newCharacter, ...prev]);
  }, []);

  const updateCharacter = useCallback((characterToUpdate) => {
    setCharacters(prev => 
      prev.map(c => c.id === characterToUpdate.id ? { ...characterToUpdate, isDefault: c.isDefault } : c)
    );
  }, []);

  const deleteCharacter = useCallback((characterId) => {
    setCharacters(prev => prev.filter(c => c.id !== characterId));
  }, []);

  return {
    characters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    charactersReady,
  };
}