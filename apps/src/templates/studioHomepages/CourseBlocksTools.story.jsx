import React from 'react';
import CourseBlocksTools from './CourseBlocksTools';

export default storybook => storybook
  .storiesOf('CourseBlocksTools', module)
  .addStoryTable([
    {
      name: 'course blocks - tools',
      description: `This is a set of course blocks listing tools`,
      story: () => (
        <CourseBlocksTools
          isEnglish={true}
          isRtl={false}
        />
      )
    },
  ]);
