// src/hooks/useCharacters.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultCharacters } from '../constants/characters';

const CHARACTERS_STORAGE_KEY = '@characters';

export function useCharacters() {
  const [characters, setCharacters] = useState([]);
  const [charactersReady, setCharactersReady] = useState(false);

  // Effect to load and merge characters from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedCharactersJSON = await AsyncStorage.getItem(CHARACTERS_STORAGE_KEY);
        const storedCharacters = storedCharactersJSON ? JSON.parse(storedCharactersJSON) : [];

        if (storedCharacters.length === 0) {
          // --- First time launch: seed with default characters ---
          setCharacters(defaultCharacters);
        } else {
          // --- Merge Logic for existing users ---
          // 1. Get the latest default characters from the constants file.
          const latestDefaults = defaultCharacters;
          
          // 2. Get all characters created by the user from storage.
          const userCreatedCharacters = storedCharacters.filter(c => !c.isDefault);
          
          // 3. Combine them. The latest defaults overwrite any old stored defaults,
          //    and user-created characters are preserved.
          const finalCharacterList = [...latestDefaults, ...userCreatedCharacters];
          
          setCharacters(finalCharacterList);
        }
      } catch (e) {
        console.warn('Error loading/merging characters from AsyncStorage:', e);
        // Fallback to default characters on any error.
        setCharacters(defaultCharacters);
      }
      setCharactersReady(true);
    })();
  }, []);

  // Effect to save characters to storage whenever they change
  useEffect(() => {
    if (charactersReady) {
      AsyncStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    }
  }, [characters, charactersReady]);

  const createCharacter = useCallback((newCharacterData) => {
    const newCharacter = {
      ...newCharacterData,
      id: `user-${Date.now().toString()}`,
      isDefault: false, // User-created characters are never default
    };
    setCharacters(prev => [newCharacter, ...prev]);
  }, []);

  const updateCharacter = useCallback((characterToUpdate) => {
    setCharacters(prev => 
      prev.map(c => c.id === characterToUpdate.id ? characterToUpdate : c)
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