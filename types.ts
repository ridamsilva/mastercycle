
export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  duration: number; // em horas ou minutos, manteremos consistente com o app (horas)
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
  sessionUrl?: string; // Specific link for this session if different/added via cycle
  completedAt?: number; // Timestamp of completion
}

export interface StudyCycle {
  id: string;
  name: string;
  items: CycleItem[];
  createdAt: number;
}
