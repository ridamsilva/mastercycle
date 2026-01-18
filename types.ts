
export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  duration: number;
  performance?: number;
  materialUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  totalHours: number;
  frequency: number;
  notebookUrl: string;
  masteryPercentage: number;
  color: string;
  topics: Topic[];
}

export interface CycleItem {
  id: string;
  subjectId: string;
  duration: number;
  completed: boolean;
  order: number;
  performance?: number;
  sessionUrl?: string;
  completedAt?: number;
}

export interface StudyCycle {
  id: string;
  name: string;
  items: CycleItem[];
  createdAt: number;
}
