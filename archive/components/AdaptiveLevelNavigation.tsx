import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KnowledgeNode, getAllKnowledgeNodes } from '../lib/knowledgeGraphEngine';

interface AdaptiveLevelNavigationProps {
  currentNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  disabled?: boolean;
}

export function AdaptiveLevelNavigation({
  currentNodeId,
  onNodeSelect,
  disabled = false,
}: AdaptiveLevelNavigationProps): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [nodeMap, setNodeMap] = useState<Map<string, KnowledgeNode>>(new Map());
  const [currentNode, setCurrentNode] = useState<KnowledgeNode | null>(null);
  const [prerequisites, setPrerequisites] = useState<KnowledgeNode[]>([]);
  const [nextNodes, setNextNodes] = useState<KnowledgeNode[]>([]);

  useEffect(() => {
    void loadGraph();
  }, [currentNodeId]);

  const loadGraph = async () => {
    setLoading(true);
    const nodes = await getAllKnowledgeNodes();
    setNodeMap(nodes);

    if (currentNodeId) {
      const current = nodes.get(currentNodeId);
      setCurrentNode(current || null);

      if (current) {
        // Load prerequisites (move down/foundational)
        const prereqs = current.prerequisites
          .map(id => nodes.get(id))
          .filter(Boolean) as KnowledgeNode[];
        setPrerequisites(prereqs);

        // Load dependent nodes (move up/advanced)
        const dependents = Array.from(nodes.values()).filter(
          n => n.prerequisites.includes(currentNodeId)
        );
        setNextNodes(dependents);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View className="bg-slate-900/40 rounded-lg p-4 items-center">
        <ActivityIndicator size="small" color="#4f7cff" />
      </View>
    );
  }

  if (!currentNode) {
    return (
      <View className="bg-slate-900/40 rounded-lg p-4">
        <Text className="text-white/60 text-sm">No learning path selected</Text>
      </View>
    );
  }

  return (
    <ScrollView className="space-y-4">
      {/* Current Node */}
      <View className="bg-slate-900/40 rounded-lg p-4 border border-blue-500/30">
        <Text className="text-blue-400 text-xs uppercase font-bold tracking-widest mb-2">
          Current Concept
        </Text>
        <Text className="text-white text-lg font-bold font-syne">{currentNode.title}</Text>
        <Text className="text-white/70 text-sm mt-1">{currentNode.description}</Text>
        <View className="flex-row items-center gap-2 mt-3">
          <View
            className={`px-2 py-1 rounded-full ${
              currentNode.difficulty_level >= 70
                ? 'bg-red-500/20'
                : currentNode.difficulty_level >= 40
                ? 'bg-orange-500/20'
                : 'bg-green-500/20'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                currentNode.difficulty_level >= 70
                  ? 'text-red-400'
                  : currentNode.difficulty_level >= 40
                  ? 'text-orange-400'
                  : 'text-green-400'
              }`}
            >
              Difficulty: {currentNode.difficulty_level}/100
            </Text>
          </View>
          <View className="px-2 py-1 rounded-full bg-slate-600/40">
            <Text className="text-xs text-slate-300 font-bold">
              ⏱ {currentNode.estimated_mastery_time_mins} min
            </Text>
          </View>
        </View>
      </View>

      {/* Adaptive Navigation */}
      <View className="space-y-3">
        {/* Prerequisites (Go Down / Build Foundation) */}
        {prerequisites.length > 0 && (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="arrow-down" size={16} color="#10b981" />
              <Text className="text-green-400 text-sm font-bold">Build Foundation</Text>
            </View>
            {prerequisites.map(prereq => (
              <TouchableOpacity
                key={prereq.id}
                disabled={disabled}
                onPress={() => onNodeSelect(prereq.id)}
                className={`bg-slate-800/60 border border-green-500/30 rounded-lg p-3 mb-2 ${
                  disabled ? 'opacity-50' : ''
                }`}
              >
                <Text className="text-green-400 text-xs uppercase font-bold tracking-widest mb-1">
                  Prerequisite
                </Text>
                <Text className="text-white font-syne">{prereq.title}</Text>
                <Text className="text-white/60 text-xs mt-1">{prereq.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Advanced Concepts (Go Up / Advance) */}
        {nextNodes.length > 0 && (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="arrow-up" size={16} color="#7c3aed" />
              <Text className="text-purple-400 text-sm font-bold">Advance Further</Text>
            </View>
            {nextNodes.slice(0, 3).map(next => (
              <TouchableOpacity
                key={next.id}
                disabled={disabled}
                onPress={() => onNodeSelect(next.id)}
                className={`bg-slate-800/60 border border-purple-500/30 rounded-lg p-3 mb-2 ${
                  disabled ? 'opacity-50' : ''
                }`}
              >
                <Text className="text-purple-400 text-xs uppercase font-bold tracking-widest mb-1">
                  Next Level
                </Text>
                <Text className="text-white font-syne">{next.title}</Text>
                <Text className="text-white/60 text-xs mt-1">{next.description}</Text>
              </TouchableOpacity>
            ))}
            {nextNodes.length > 3 && (
              <Text className="text-white/40 text-xs text-center mt-2">
                +{nextNodes.length - 3} more advanced concepts available
              </Text>
            )}
          </View>
        )}

        {/* No navigation available */}
        {prerequisites.length === 0 && nextNodes.length === 0 && (
          <View className="bg-slate-900/40 rounded-lg p-4 items-center">
            <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            <Text className="text-white font-bold mt-2">Mastery Target</Text>
            <Text className="text-white/60 text-sm text-center mt-1">
              You've reached an endpoint in this learning path
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
