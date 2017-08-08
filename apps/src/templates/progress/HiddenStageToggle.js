import React from 'react';
import PropTypes from 'prop-types';
import Button from '../Button';
import i18n from '@cdo/locale';

const styles = {
  main: {
    wrap: 'nowrap',
    marginTop: 5,
    marginLeft: 15,
    marginRight: 15
  },
  button: {
    display: 'inline-block',
    paddingLeft: 0,
    paddingRight: 0,
    boxSizing: 'border-box',
    width: '50%'
  },
  leftButton: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  rightButton: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
};

export default function HiddenStageToggle({ hidden, onChange }) {
  return (
    <div style={styles.main} className="uitest-togglehidden">
      <Button
        onClick={() => onChange('visible')}
        text={i18n.visible()}
        color={Button.ButtonColor.gray}
        disabled={!hidden}
        icon="eye"
        style={{...styles.button, ...styles.leftButton}}
      />
      <Button
        onClick={() => onChange('hidden')}
        text={i18n.hidden()}
        color={Button.ButtonColor.gray}
        disabled={hidden}
        icon="eye-slash"
        style={{...styles.button, ...styles.rightButton}}
      />
    </div>
  );
}
HiddenStageToggle.propTypes = {
  hidden: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};
