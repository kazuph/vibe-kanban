import { useCallback } from 'react';
import { useJsonPatchStream } from './useJsonPatchStream';
import type { TaskWithAttemptStatus } from 'shared/types';

type TasksState = {
  tasks: Record<string, TaskWithAttemptStatus>;
};

interface UseProjectTasksResult {
  tasks: TaskWithAttemptStatus[];
  tasksById: Record<string, TaskWithAttemptStatus>;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}

/**
 * Stream tasks for a project via SSE (JSON Patch) and expose as array + map.
 * Server sends initial snapshot: replace /tasks with an object keyed by id.
 * Live updates arrive at /tasks/<id> via add/replace/remove operations.
 */
export const useProjectTasks = (
  projectId: string | undefined
): UseProjectTasksResult => {
  const endpoint = projectId
    ? `/api/tasks/stream?project_id=${encodeURIComponent(projectId)}`
    : undefined;

  const initialData = useCallback((): TasksState => ({ tasks: {} }), []);

  const { data, isConnected, error } = useJsonPatchStream<TasksState>(
    endpoint,
    !!projectId,
    initialData
  );

  const tasksById = data?.tasks ?? {};
  const tasks = Object.values(tasksById).sort(
    (a, b) =>
      new Date(b.created_at as unknown as string).getTime() -
      new Date(a.created_at as unknown as string).getTime()
  );
  const isLoading = !data && !error; // until first snapshot

  return { tasks, tasksById, isLoading, isConnected, error };
};
