import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Layout } from '../../components/Layout';
import { TrainingSession } from '../../components/training/TrainingSession';
import type { EmployeeTrainingDetail } from '../../types';

async function fetchTraining(id: string): Promise<EmployeeTrainingDetail> {
  const { data } = await apiClient.get(`/employee/trainings/${id}`);
  return data;
}

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: training, isLoading } = useQuery({
    queryKey: ['employee', 'training', id],
    queryFn: () => fetchTraining(id ?? ''),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading training session…</p>
        </div>
      </Layout>
    );
  }

  if (!training || !id) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
          <p className="font-semibold">Training not found</p>
          <p className="text-sm">The training might have been removed or you don't have access to it.</p>
        </div>
      </Layout>
    );
  }

  return <TrainingSession training={training} trainingId={id} />;
}
