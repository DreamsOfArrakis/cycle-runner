'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, Loader2, PlayCircle } from 'lucide-react';

interface Test {
  name: string;
  file: string;
}

interface Category {
  name: string;
  displayName: string;
  tests: Test[];
}

interface TestSelectorProps {
  suiteId: string;
  onRunTests: (selectedTests: { testName: string; testFile: string }[]) => void;
  isRunning: boolean;
}

export default function TestSelector({ suiteId, onRunTests, isRunning }: TestSelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/available-tests');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
        // Expand all categories by default
        setExpandedCategories(new Set(data.categories.map((c: Category) => c.name)));
        // Start with all tests unchecked - user can select what they want
        setSelectedTests(new Set());
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleCategorySelection = (category: Category) => {
    const categoryTestIds = category.tests.map(test => `${category.name}:${test.name}`);
    const allSelected = categoryTestIds.every(id => selectedTests.has(id));
    
    const newSelected = new Set(selectedTests);
    if (allSelected) {
      // Deselect all
      categoryTestIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all
      categoryTestIds.forEach(id => newSelected.add(id));
    }
    setSelectedTests(newSelected);
  };

  const toggleTest = (categoryName: string, testName: string) => {
    const testId = `${categoryName}:${testName}`;
    const newSelected = new Set(selectedTests);
    
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const isCategorySelected = (category: Category) => {
    const categoryTestIds = category.tests.map(test => `${category.name}:${test.name}`);
    return categoryTestIds.every(id => selectedTests.has(id));
  };

  const isCategoryPartiallySelected = (category: Category) => {
    const categoryTestIds = category.tests.map(test => `${category.name}:${test.name}`);
    const someSelected = categoryTestIds.some(id => selectedTests.has(id));
    const allSelected = categoryTestIds.every(id => selectedTests.has(id));
    return someSelected && !allSelected;
  };

  const handleRunTests = () => {
    const testsToRun = Array.from(selectedTests).map(testId => {
      const [categoryName, testName] = testId.split(':');
      const category = categories.find(c => c.name === categoryName);
      const test = category?.tests.find(t => t.name === testName);
      return {
        testName: testName,
        testFile: test?.file || '',
      };
    });
    onRunTests(testsToRun);
  };

  const selectAll = () => {
    const allTestIds = categories.flatMap(cat =>
      cat.tests.map(test => `${cat.name}:${test.name}`)
    );
    setSelectedTests(new Set(allTestIds));
  };

  const deselectAll = () => {
    setSelectedTests(new Set());
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading tests...</span>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2 text-lg">No tests available</p>
          <p className="text-sm text-gray-400">
            No tests have been discovered for this test suite. Tests are discovered from the configured test files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {selectedTests.size} of {categories.flatMap(c => c.tests).length} selected
          </span>
          <button
            onClick={selectAll}
            disabled={isRunning || selectedTests.size === categories.flatMap(c => c.tests).length}
            className="text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-80"
            style={{ color: '#FD5D1C' }}
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            disabled={isRunning || selectedTests.size === 0}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
        <button
          onClick={handleRunTests}
          disabled={selectedTests.size === 0 || isRunning}
          className="flex items-center space-x-2 px-6 py-2.5 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium hover:opacity-90"
          style={{ backgroundColor: selectedTests.size === 0 || isRunning ? '#d1d5db' : '#FD5D1C' }}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              <span>Run {selectedTests.size} Test{selectedTests.size !== 1 ? 's' : ''}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const isSelected = isCategorySelected(category);
          const isPartial = isCategoryPartiallySelected(category);

          return (
            <div key={category.name} className="rounded-lg" style={{ border: '1px solid #0e545e33' }}>
              <div className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 transition">
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => toggleCategorySelection(category)}
                  className="p-1 hover:bg-gray-200 rounded ml-2"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5" style={{ color: '#FD5D1C' }} />
                  ) : isPartial ? (
                    <Square className="w-5 h-5" style={{ color: '#FD5D1C', opacity: 0.5 }} />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center space-x-2 flex-1 text-left ml-2"
                >
                  <span className="font-medium" style={{ color: '#0e545e' }}>{category.displayName}</span>
                  <span className="text-sm text-gray-500">({category.tests.length} tests)</span>
                </button>
              </div>

              {isExpanded && (
                <div className="p-3 space-y-1 bg-white">
                  {category.tests.map((test) => {
                    const testId = `${category.name}:${test.name}`;
                    const isTestSelected = selectedTests.has(testId);

                    return (
                      <div
                        key={testId}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleTest(category.name, test.name)}
                      >
                        {isTestSelected ? (
                          <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#FD5D1C' }} />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm" style={{ color: '#0e545e' }}>{test.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

