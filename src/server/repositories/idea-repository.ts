export type IdeaAuthor = {
  id: string;
  name: string | null;
  pseudonym: string | null;
  brainId: string | null;
};

export type IdeaRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  user: IdeaAuthor;
  votes: { id: string }[];
  _count: { votes: number };
};

export type CreateIdeaInput = {
  userId: string;
  title: string;
  description: string;
};

export interface IdeaRepository {
  findAll(viewerUserId: string | null): Promise<IdeaRecord[]>;
  create(input: CreateIdeaInput): Promise<IdeaRecord>;
  exists(id: string): Promise<boolean>;
  upsertVote(ideaId: string, userId: string): Promise<void>;
}
