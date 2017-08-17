/** @file Reusable widget to display and manage sections owned by the
 *        current user. */
import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import SectionTable from './SectionTable';
import RosterDialog from './RosterDialog';
import Button from '@cdo/apps/templates/Button';
import {
  beginEditingNewSection,
  beginEditingSection,
  beginImportRosterFlow,
} from './teacherSectionsRedux';
import i18n from '@cdo/locale';
import experiments from '@cdo/apps/util/experiments';
import AddSectionDialog from "./AddSectionDialog";
import EditSectionDialog from "./EditSectionDialog";
import SetUpSections from '../studioHomepages/SetUpSections';

const styles = {
  button: {
    marginBottom: 20,
    marginRight: 5,
  }
};

class OwnedSections extends React.Component {
  static propTypes = {
    isRtl: PropTypes.bool,
    queryStringOpen: PropTypes.string,

    // redux provided
    numSections: PropTypes.number.isRequired,
    provider: PropTypes.string,
    asyncLoadComplete: PropTypes.bool.isRequired,
    beginEditingNewSection: PropTypes.func.isRequired,
    beginEditingSection: PropTypes.func.isRequired,
    beginImportRosterFlow: PropTypes.func.isRequired,
  };

  componentWillMount() {
    if (experiments.isEnabled('importClassroom')) {
      this.provider = this.props.provider;
    }
  }

  componentDidMount() {
    const {
      queryStringOpen,
      beginImportRosterFlow,
    } = this.props;

    if (experiments.isEnabled('importClassroom')) {
      if (queryStringOpen === 'rosterDialog') {
        beginImportRosterFlow();
      }
    }
  }

  handleEditRequest = section => {
    this.props.beginEditingSection(section.id);
  };

  render() {
    const {
      isRtl,
      numSections,
      asyncLoadComplete,
      beginEditingNewSection,
    } = this.props;
    if (!asyncLoadComplete) {
      return null;
    }

    return (
      <div className="uitest-owned-sections">
        {numSections === 0 ? (
          <SetUpSections isRtl={isRtl}/>
        ) : (
          <div>
            <Button
              className="uitest-newsection"
              text={i18n.newSection()}
              style={styles.button}
              onClick={beginEditingNewSection}
              color={Button.ButtonColor.gray}
            />
            {numSections > 0 &&
              <SectionTable onEdit={this.handleEditRequest}/>
            }
          </div>
        )}
        <RosterDialog/>
        <AddSectionDialog/>
        <EditSectionDialog/>
      </div>
    );
  }
}
export const UnconnectedOwnedSections = OwnedSections;

export default connect(state => ({
  numSections: state.teacherSections.sectionIds.length,
  provider: state.teacherSections.provider,
  asyncLoadComplete: state.teacherSections.asyncLoadComplete,
}), {
  beginEditingNewSection,
  beginEditingSection,
  beginImportRosterFlow,
})(OwnedSections);
