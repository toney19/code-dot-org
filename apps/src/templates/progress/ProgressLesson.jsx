import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import ProgressLessonContent from './ProgressLessonContent';
import FontAwesome from '../FontAwesome';
import color from "@cdo/apps/util/color";
import { levelType, lessonType } from './progressTypes';
import { ViewType } from '@cdo/apps/code-studio/stageLockRedux';
import i18n from '@cdo/locale';
import { lessonIsVisible, lessonIsLockedForAllStudents, stageLocked } from './progressHelpers';
import ProgressLessonTeacherInfo from './ProgressLessonTeacherInfo';
import FocusAreaIndicator from './FocusAreaIndicator';
import ReactTooltip from 'react-tooltip';
import _ from 'lodash';

const styles = {
  outer: {
    position: 'relative',
    display: 'table',
    width: '100%',
    height: '100%',
    background: color.lightest_gray,
    borderColor: color.border_gray,
    borderStyle: 'solid',
    borderRadius: 2,
    // When toggling between hidden and not, we change our border size from 1 to 4.
    // We want to limit how much toggling this changes our sizing, so we add +3
    // to each of our non-hidden margins
    borderWidth: 1,
    marginTop: 3,
    marginBottom: 15,
    marginLeft: 3,
    marginRight: 3
  },
  rightCol: {
    display: 'table-cell',
    verticalAlign: 'top',
    width: 200,
    height: '100%',
    borderRadius: 2,
  },
  main: {
    padding: 20,
  },
  heading: {
    fontSize: 18,
    fontFamily: '"Gotham 5r", sans-serif',
    cursor: 'pointer'
  },
  hiddenOrLocked: {
    borderStyle: 'dashed',
    borderWidth: 4,
    marginTop: 0,
    marginBottom: 12,
    marginLeft: 0,
    marginRight: 0,
  },
  translucent: {
    opacity: 0.6
  },
  caret: {
    marginRight: 10
  },
  icon: {
    marginRight: 5,
    fontSize: 18,
    color: color.cyan
  },
  unlockedIcon: {
    color: color.orange
  }
};

const ProgressLesson = React.createClass({
  propTypes: {
    lesson: lessonType.isRequired,
    levels: PropTypes.arrayOf(levelType).isRequired,

    // redux provided
    currentStageId: PropTypes.number,
    showTeacherInfo: PropTypes.bool.isRequired,
    viewAs: PropTypes.oneOf(Object.values(ViewType)).isRequired,
    showLockIcon: PropTypes.bool.isRequired,
    lessonIsVisible: PropTypes.func.isRequired,
    lessonLockedForSection: PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      // We want teachers to start with everything uncollapsed. For students we
      // collapse everything except current stage
      collapsed: this.props.viewAs !== ViewType.Teacher &&
        this.props.currentStageId !== this.props.lesson.id
    };
  },

  componentWillReceiveProps(nextProps) {
    // If we're assigned a stageId, and it is for this lesson, uncollapse
    if (nextProps.currentStageId !== this.props.currentStageId) {
      this.setState({
        collapsed: this.state.collapsed && nextProps.currentStageId !== this.props.lesson.id
      });
    }
  },

  toggleCollapsed() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  },

  render() {
    const {
      lesson,
      levels,
      showTeacherInfo,
      viewAs,
      showLockIcon,
      lessonIsVisible,
      lessonLockedForSection
    } = this.props;

    if (!lessonIsVisible(lesson, viewAs)) {
      return null;
    }

    // Is this a hidden stage that we still render because we're a teacher
    const hiddenForStudents = !lessonIsVisible(lesson, ViewType.Student);
    const title = lesson.stageNumber ?
      i18n.lessonNumbered({lessonNumber: lesson.stageNumber, lessonName: lesson.name}) :
      lesson.name;
    const caret = this.state.collapsed ? "caret-right" : "caret-down";

    // Treat the stage as locked if either
    // (a) it is locked for this user (in the case of a student)
    // (b) it is locked for all students in the section (in the case of a teacher)
    const locked = stageLocked(levels) || lessonLockedForSection(lesson.id);

    const hiddenOrLocked = hiddenForStudents || locked;
    const tooltipId = _.uniqueId();

    const description = viewAs === ViewType.Teacher ? lesson.description_teacher : lesson.description_student;
    return (
      <div
        style={{
          ...styles.outer,
          ...(hiddenOrLocked && styles.hiddenOrLocked)
        }}
      >
        <div
          style={{
            ...styles.main,
            ...(hiddenOrLocked && viewAs !== ViewType.Teacher && styles.translucent)
          }}
        >
          <div
            style={styles.heading}
            onClick={this.toggleCollapsed}
          >
            <FontAwesome icon={caret} style={styles.caret}/>
            {hiddenForStudents &&
              <FontAwesome
                icon="eye-slash"
                style={styles.icon}
              />
            }
            {showLockIcon && lesson.lockable && locked &&
              <FontAwesome
                icon="lock"
                style={styles.icon}
              />
            }
            {showLockIcon && lesson.lockable && !locked &&
              <span data-tip data-for={tooltipId}>
                <FontAwesome
                  icon="unlock"
                  style={{
                    ...styles.icon,
                    ...styles.unlockedIcon
                  }}
                />
                {viewAs === ViewType.Teacher &&
                  <ReactTooltip
                    id={tooltipId}
                    role="tooltip"
                    wrapper="span"
                    effect="solid"
                  >
                    {i18n.lockAssessmentLong()}
                  </ReactTooltip>
                }
              </span>
            }
            <span>{title}</span>
          </div>
          {!this.state.collapsed &&
            <ProgressLessonContent
              description={description}
              levels={levels}
              disabled={locked && viewAs !== ViewType.Teacher}
            />
          }
        </div>
        {showTeacherInfo && viewAs === ViewType.Teacher &&
          <div style={styles.rightCol}>
            <ProgressLessonTeacherInfo lesson={lesson}/>
          </div>
        }
        {lesson.isFocusArea && <FocusAreaIndicator/>}
      </div>
    );
  }
});

export const UnconnectedProgressLesson = ProgressLesson;

export default connect(state => ({
  currentStageId: state.progress.currentStageId,
  showTeacherInfo: state.progress.showTeacherInfo,
  viewAs: state.stageLock.viewAs,
  showLockIcon: !!state.sections.selectedSectionId || state.stageLock.viewAs === ViewType.Student,
  lessonLockedForSection: lessonId => lessonIsLockedForAllStudents(lessonId, state),
  lessonIsVisible: (lesson, viewAs) => lessonIsVisible(lesson, state, viewAs)
}))(ProgressLesson);
