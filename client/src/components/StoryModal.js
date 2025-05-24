import React, { useState, useEffect } from 'react';

/**
 * StoryModal component for adding or editing stories
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSave - Function to save the story
 * @param {Object|null} props.story - Story data (null for new story)
 */
const StoryModal = ({ isOpen, onClose, onSave, story }) => {
  const [title, setTitle] = useState('');
  const [criteriaText, setCriteriaText] = useState('');

  // Update form when story changes
  useEffect(() => {
    if (story) {
      setTitle(story.title || '');
      
      // Convert criteria array to text
      if (story.criteria && Array.isArray(story.criteria)) {
        const criteriaLines = story.criteria.map(c => c.text).join('\n');
        setCriteriaText(criteriaLines);
      } else {
        setCriteriaText('');
      }
    } else {
      setTitle('');
      setCriteriaText('');
    }
  }, [story, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('El título es obligatorio.');
      return;
    }
    
    // Convert criteria text to array of objects
    const criteria = criteriaText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(text => {
        // If editing, preserve checked status of existing criteria
        if (story && story.criteria) {
          const existingCriterion = story.criteria.find(c => c.text === text);
          if (existingCriterion) {
            return { text, checked: existingCriterion.checked };
          }
        }
        return { text, checked: false };
      });
    
    onSave({ title, criteria });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {story ? 'Editar Historia' : 'Añadir Nueva Historia'}
            </h2>
            
            <div className="mb-4">
              <label htmlFor="storyTitle" className="block text-sm font-medium text-slate-700 mb-1">
                Título:
              </label>
              <input
                type="text"
                id="storyTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="storyCriteria" className="block text-sm font-medium text-slate-700 mb-1">
                Criterios de Aceptación (uno por línea):
              </label>
              <textarea
                id="storyCriteria"
                value={criteriaText}
                onChange={(e) => setCriteriaText(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md h-32"
              />
            </div>
          </div>
          
          <div className="bg-slate-50 px-6 py-3 flex justify-end space-x-2 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Guardar Historia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoryModal;