export interface VectorStoreDataSource {
  type: 'vector_store';
  collectionName: string;
  searchOptions?: any;
}
