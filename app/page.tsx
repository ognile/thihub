import Header from '@/components/Header';
import Post from '@/components/Post';

export default function Home() {
  return (
    <div className="min-h-screen bg-fb-bg pb-10">
      <Header />

      <main className="pt-16 px-0 sm:px-4 max-w-xl mx-auto">
        {/* Create Post Input Placeholder */}
        <div className="bg-fb-card p-3 mb-4 shadow-sm rounded-none sm:rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 bg-fb-bg rounded-full h-10 flex items-center px-4 text-fb-text-secondary cursor-pointer hover:bg-gray-200 transition-colors">
            What's on your mind?
          </div>
          <div className="flex items-center gap-3 text-fb-text-secondary">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-500">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        </div>

        {/* Feed */}
        <Post
          id="top-health-1"
          author="Top Health Daily"
          time="2h"
          content="Discover the 7 superfoods that can boost your immune system naturally! 🥦🍎 #Health #Wellness #Nutrition"
          image="https://picsum.photos/seed/health1/800/600"
          likes={1205}
          comments={45}
          shares={12}
        />

        <Post
          id="top-health-2"
          author="Tech Trends"
          time="5h"
          content="The future of AI is here. Are we ready for what comes next? 🤖"
          image="https://picsum.photos/seed/tech1/800/600"
          likes={892}
          comments={120}
          shares={56}
        />

        <Post
          id="top-health-3"
          author="Travel Diaries"
          time="1d"
          content="Just arrived in Bali! The views are absolutely breathtaking. 🌴☀️"
          image="https://picsum.photos/seed/travel1/800/600"
          likes={3400}
          comments={210}
          shares={89}
        />
      </main>
    </div>
  );
}
