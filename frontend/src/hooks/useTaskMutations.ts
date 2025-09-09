import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { emitTaskCreated } from '@/lib/task-events';
import type { CreateTask, Task } from 'shared/types';

export function useTaskMutations(projectId?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invalidateQueries = (taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    }
  };

  const createTask = useMutation({
    mutationFn: (data: CreateTask) => tasksApi.create(data),
    onSuccess: (createdTask: Task) => {
      // Optimistically add to board immediately
      emitTaskCreated(createdTask);
      invalidateQueries();
      navigate(`/projects/${projectId}/tasks/${createdTask.id}`, {
        replace: true,
      });
    },
    onError: (err) => {
      console.error('Failed to create task:', err);
    },
  });

  const createAndStart = useMutation({
    mutationFn: (data: CreateTask) => tasksApi.createAndStart(data),
    onSuccess: (createdTask: Task) => {
      // Optimistically add to board immediately
      emitTaskCreated(createdTask);
      invalidateQueries();
      navigate(`/projects/${projectId}/tasks/${createdTask.id}`, {
        replace: true,
      });
    },
    onError: (err) => {
      console.error('Failed to create and start task:', err);
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      tasksApi.update(taskId, data),
    onSuccess: (updatedTask: Task) => {
      invalidateQueries(updatedTask.id);
    },
    onError: (err) => {
      console.error('Failed to update task:', err);
    },
  });

  return {
    createTask,
    createAndStart,
    updateTask,
  };
}
