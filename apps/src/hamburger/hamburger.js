import $ from 'jquery';
import trackEvent from '../util/trackEvent';
import experiments from '@cdo/apps/util/experiments';

export const initHamburger = function () {
  $(function () {

    //Removes sections tab in header for section-flow experiments
    //Temporary fix until tab can be completely deleted
    if (experiments.isEnabled('section-flow-2017')) {
      $('#header-teacher-sections').remove();
      $('#hamburger-teacher-sections').parent().parent().remove();
    }

    $('#hamburger-icon').click(function (e) {
      $(this).toggleClass( 'active' );
      $('#hamburger #hamburger-contents').slideToggle();
      e.preventDefault();
    });

    $(document).on('click',function (e) {
      var hamburger = $('#hamburger');

      // If we didn't click the hamburger itself, and also nothing inside it,
      // then hide it.
      if (!hamburger.is(e.target)
          && hamburger.has(e.target).length === 0) {
        hamburger.children('#hamburger-contents').slideUp();
        $('#hamburger-icon').removeClass('active');
      }
    });

    $(".hamburger-expandable-item").each(function () {
      $(this).click(function (e) {
        $("#" + $(this).attr('id') + "-items").slideToggle();
        $(this).find(".arrow-down").toggle();
        $(this).find(".arrow-up").toggle();
        e.preventDefault();
      });
    });

    $.ajax({
      type: "GET",
      url: '/dashboardapi/user_menu',
      success: function (data) {
        $('#sign_in_or_user').html(data);
      }
    });

    $("#hamburger #report-bug").click(function () {
      trackEvent("help_ui", "report-bug", "hamburger");
    });

    $("#hamburger #support").click(function () {
      trackEvent("help_ui", "support", "hamburger");
    });

    // This item is not in the hamburger, but actually in the studio footer.
    $(".footer #support").click(function () {
      trackEvent("help_ui", "support", "studio_footer");
    });

    // This item is not in the hamburger, but actually in the pegasus footers for
    // desktop and mobile.
    $("#pagefooter #support").each(function () {
      $(this).click(function () {
        trackEvent("help_ui", "support", "studio_footer");
      });
    });

  });
};
