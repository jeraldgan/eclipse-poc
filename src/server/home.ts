'use server';

export type PostType = {
  id: number;
  title: string;
  completed: boolean;
};

export const getPosts = async () => {
  try {
    const response = await fetch(
      'https://jsonplaceholder.typicode.com/todos?_limit=5',
    );
    const data: PostType[] = await response.json();

    return { posts: data };
  } catch (error) {
    return {
      error: {
        message: 'Something went wrong',
      },
    };
  }
};
