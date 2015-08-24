require 'digest/sha1'

module LevelsHelper
  include ApplicationHelper
  def build_script_level_path(script_level, params = {})
    if script_level.script.name == Script::HOC_NAME
      hoc_chapter_path(script_level.chapter, params)
    elsif script_level.script.name == Script::FLAPPY_NAME
      flappy_chapter_path(script_level.chapter, params)
    else
      script_stage_script_level_path(script_level.script, script_level.stage, script_level, params)
    end
  end

  def build_script_level_url(script_level, params = {})
    url_from_path(build_script_level_path(script_level, params))
  end

  def url_from_path(path)
    "#{root_url.chomp('/')}#{path}"
  end

  # Create a new channel.
  # @param [Hash] data Data to store in the channel.
  # @param [String] src Optional source channel to copy data from, instead of
  #   using the value from the `data` param.
  def create_channel(data = {}, src = nil)

    result = ChannelsApi.call(request.env.merge(
      'REQUEST_METHOD' => 'POST',
      'PATH_INFO' => '/v3/channels',
      'REQUEST_PATH' => '/v3/channels',
      'QUERY_STRING' => src ? "src=#{src}" : '',
      'CONTENT_TYPE' => 'application/json;charset=utf-8',
      'rack.input' => StringIO.new(data.to_json)
    ))
    headers = result[1]

    # Return the newly created channel ID.
    headers['Location'].split('/').last
  end

  def set_channel
    # This only works for logged-in users because the storage_id cookie is not
    # sent back to the client if it is modified by ChannelsApi.
    return unless current_user

    # The channel should be associated with the template level, if present.
    # Otherwise the current level.
    host_level = @level.project_template_level || @level

    if @user
      # "answers" are in the channel so instead of doing
      # set_level_source to load answers when looking at another user,
      # we have to load the channel here.

      channel_token = ChannelToken.find_by(level: host_level, user: @user)
      view_options readonly_workspace: true, callouts: []
    else
      # If `create` fails because it was beat by a competing request, a second
      # `find_by` should succeed.
      channel_token = retryable on: [Mysql2::Error, ActiveRecord::RecordNotUnique], matching: /Duplicate entry/ do
        # your own channel
        ChannelToken.find_or_create_by!(level: host_level, user: current_user) do |ct|
          # Get a new channel_id.
          ct.channel = create_channel(hidden: true)
        end
      end
    end

    if channel_token
      view_options channel: channel_token.channel
    end
  end

  def select_and_track_autoplay_video
    seen_videos = session[:videos_seen] || Set.new
    autoplay_video = nil

    is_legacy_level = @script_level && @script_level.script.legacy_curriculum?

    if is_legacy_level
      autoplay_video = @level.related_videos.find { |video| !seen_videos.include?(video.key) }
    elsif @level.specified_autoplay_video
      unless seen_videos.include?(@level.specified_autoplay_video.key)
        autoplay_video = @level.specified_autoplay_video
      end
    end

    return unless autoplay_video

    seen_videos.add(autoplay_video.key)
    session[:videos_seen] = seen_videos
    autoplay_video.summarize unless params[:noautoplay]
  end

  def select_and_remember_callouts(always_show = false)
    session[:callouts_seen] ||= Set.new
    # Filter if already seen (unless always_show)
    callouts_to_show = @level.available_callouts(@script_level).
      reject { |c| !always_show && session[:callouts_seen].include?(c.localization_key) }.
      each { |c| session[:callouts_seen].add(c.localization_key) }
    # Localize
    callouts_to_show.map do |callout|
      callout_hash = callout.attributes
      callout_hash.delete('localization_key')
      callout_text = data_t('callout.text', callout.localization_key)
      if I18n.locale == 'en-us' || callout_text.nil?
        callout_hash['localized_text'] = callout.callout_text
      else
        callout_hash['localized_text'] = callout_text
      end
      callout_hash
    end
  end

  # Options hash for all level types
  def app_options
    set_channel if @level.channel_backed?

    callouts = params[:share] ? [] : select_and_remember_callouts(params[:show_callouts])
    # Set videos and callouts.
    view_options(
      autoplay_video: select_and_track_autoplay_video,
      callouts: callouts
    )

    # External project levels are any levels of type 'external' which use
    # the projects code to save and load the user's progress on that level.
    view_options(is_external_project_level: true) if @level.pixelation?

    view_options(is_channel_backed: true) if @level.channel_backed?

    if @level.is_a? Blockly
      blockly_options
    elsif @level.is_a? DSLDefined
      dsl_defined_options
    else
      # currently, all levels are Blockly or DSLDefined except for Unplugged
      view_options.camelize_keys
    end
  end

  # Options hash for DSLDefined
  def dsl_defined_options
    app_options = {}

    level_options = app_options[:level] ||= Hash.new

    level_options[:lastAttempt] = @last_attempt
    level_options.merge! @level.properties.camelize_keys

    app_options.merge! view_options.camelize_keys

    app_options
  end

  # Options hash for Blockly
  def blockly_options
    l = @level
    throw ArgumentError("#{l} is not a Blockly object") unless l.is_a? Blockly
    # Level-dependent options
    app_options = l.blockly_options.dup
    level_options = app_options[:level] = app_options[:level].dup

    # Locale-dependent option
    # Fetch localized strings
    if l.custom?
      loc_val = data_t("instructions", "#{l.name}_instruction")
      unless I18n.locale.to_s == 'en-us' || loc_val.nil?
        level_options['instructions'] = loc_val
      end
    else
      %w(instructions).each do |label|
        val = [l.game.app, l.game.name].map { |name|
          data_t("level.#{label}", "#{name}_#{l.level_num}")
        }.compact.first
        level_options[label] ||= val unless val.nil?
      end
    end

    # Script-dependent option
    script = @script
    app_options[:scriptId] = script.id if script

    # ScriptLevel-dependent option
    script_level = @script_level
    level_options['puzzle_number'] = script_level ? script_level.position : 1
    level_options['stage_total'] = script_level ? script_level.stage_total : 1

    # LevelSource-dependent options
    app_options[:level_source_id] = @level_source.id if @level_source

    # Edit blocks-dependent options
    if level_view_options[:edit_blocks]
      # Pass blockly the edit mode: "<start|toolbox|required>_blocks"
      level_options['edit_blocks'] = level_view_options[:edit_blocks]
      level_options['edit_blocks_success'] = t('builder.success')
      level_options['toolbox'] = level_view_options[:toolbox_blocks]
      level_options['embed'] = false
      level_options['hideSource'] = false
    end

    if @level.game.uses_pusher?
      app_options['usePusher'] = CDO.use_pusher
      app_options['pusherApplicationKey'] = CDO.pusher_application_key
    end

    # Process level view options
    level_overrides = level_view_options.dup
    if level_options['embed'] || level_overrides[:embed]
      level_overrides.merge!(hide_source: true, show_finish: true)
    end
    if level_overrides[:embed]
      view_options(no_padding: true, no_header: true, no_footer: true, white_background: true)
    end
    view_options(no_footer: true) if level_overrides[:share] && browser.mobile?

    level_overrides.merge!(no_padding: view_options[:no_padding])

    # Add all level view options to the level_options hash
    level_options.merge! level_overrides.camelize_keys
    app_options.merge! view_options.camelize_keys

    # Move these values up to the app_options hash
    %w(hideSource share noPadding embed).each do |key|
      if level_options[key]
        app_options[key.to_sym] = level_options.delete key
      end
    end

    # User/session-dependent options
    app_options[:disableSocialShare] = true if (current_user && current_user.under_13?) || app_options[:embed]
    app_options[:isLegacyShare] = true if @is_legacy_share
    app_options[:isMobile] = true if browser.mobile?
    app_options[:applabUserId] = applab_user_id if @game == Game.applab
    app_options[:isAdmin] = true if (@game == Game.applab && current_user && current_user.admin?)
    app_options[:pinWorkspaceToBottom] = true if enable_scrolling?
    app_options[:hasVerticalScrollbars] = true if enable_scrolling?
    app_options[:showExampleTestButtons] = true if enable_examples?
    app_options[:rackEnv] = CDO.rack_env
    app_options[:report] = {
        fallback_response: @fallback_response,
        callback: @callback,
    }
    level_options[:lastAttempt] = @last_attempt

    # Request-dependent option
    app_options[:sendToPhone] = request.location.try(:country_code) == 'US' ||
        (!Rails.env.production? && request.location.try(:country_code) == 'RD') if request
    app_options[:send_to_phone_url] = send_to_phone_url if app_options[:sendToPhone]

    app_options
  end

  LevelViewOptions = Struct.new *%i(
    success_condition
    start_blocks
    toolbox_blocks
    edit_blocks
    skip_instructions_popup
    embed
    share
    hide_source
  )
  # Sets custom level options to be used by the view layer. The option hash is frozen once read.
  def level_view_options(opts = nil)
    @level_view_options ||= LevelViewOptions.new
    if opts.blank?
      @level_view_options.freeze.to_h.delete_if { |k, v| v.nil? }
    else
      opts.each{|k, v| @level_view_options[k] = v}
    end
  end

  def string_or_image(prefix, text)
    return unless text
    path, width = text.split(',')
    if %w(.jpg .png .gif).include? File.extname(path)
      "<img src='#{path.strip}' #{"width='#{width.strip}'" if width}></img>"
    elsif File.extname(path).ends_with? '_blocks'
      # '.start_blocks' takes the XML from the start_blocks of the specified level.
      ext = File.extname(path)
      base_level = File.basename(path, ext)
      level = Level.find_by(name: base_level)
      block_type = ext.slice(1..-1)
      content_tag(:iframe, '', {
          src: url_for(controller: :levels, action: :embed_blocks, level_id: level.id, block_type: block_type).strip,
          width: width ? width.strip : '100%',
          scrolling: 'no',
          seamless: 'seamless',
          style: 'border: none;',
      })

    elsif File.extname(path) == '.level'
      base_level = File.basename(path, '.level')
      level = Level.find_by(name: base_level)
      content_tag(:div,
        content_tag(:iframe, '', {
          src: url_for(level_id: level.id, controller: :levels, action: :embed_level).strip,
          width: (width ? width.strip : '100%'),
          scrolling: 'no',
          seamless: 'seamless',
          style: 'border: none;'
        }), {class: 'aspect-ratio'})
    else
      data_t(prefix + '.' + @level.name, text)
    end
  end

  def multi_t(text)
    string_or_image('multi', text)
  end

  def match_t(text)
    string_or_image('match', text)
  end

  def level_title
    if @script_level
      script =
        if @script_level.script.flappy?
          data_t 'game.name', @game.name
        else
          data_t_suffix 'script.name', @script_level.script.name, 'title'
        end
      stage = @script_level.name
      position = @script_level.position
      if @script_level.script.stages.many?
        "#{script}: #{stage} ##{position}"
      elsif @script_level.position != 1
        "#{script} ##{position}"
      else
        script
      end
    else
      @level.key
    end
  end

  def video_key_choices
    Video.all.map(&:key)
  end

  # Constructs pairs of [filename, asset path] for a dropdown menu of available ani-gifs
  def instruction_gif_choices
    all_filenames = Dir.chdir(Rails.root.join('config', 'scripts', instruction_gif_relative_path)){ Dir.glob(File.join("**", "*")) }
    all_filenames.map {|filename| [filename, instruction_gif_asset_path(filename)] }
  end

  def instruction_gif_asset_path filename
    File.join('/', instruction_gif_relative_path, filename)
  end

  def instruction_gif_relative_path
    File.join("script_assets", "k_1_images", "instruction_gifs")
  end

  def boolean_check_box(f, field_name_symbol)
    f.check_box field_name_symbol, {}, JSONValue.boolean_string_true, JSONValue.boolean_string_false
  end

  SoftButton = Struct.new(:name, :value)
  def soft_button_options
    [
        SoftButton.new('Left', 'leftButton'),
        SoftButton.new('Right', 'rightButton'),
        SoftButton.new('Down', 'downButton'),
        SoftButton.new('Up', 'upButton'),
    ]
  end

  # Unique, consistent ID for a user of an applab app.
  def applab_user_id
    channel_id = "1337" # Stub value, until storage for channel_id's is available.
    user_id = current_user ? current_user.id.to_s : session.id
    Digest::SHA1.base64digest("#{channel_id}:#{user_id}").tr('=', '')
  end

  def enable_scrolling?
    @level.is_a?(Blockly)
  end

  def enable_examples?
    current_user && current_user.admin? && @level.is_a?(Blockly)
  end

  # If this is a restricted level (i.e. applab) and user is under 13, redirect with a flash alert
  def redirect_applab_under_13(level)
    return unless level.game == Game.applab

    if current_user && current_user.under_13?
      redirect_to '/', :flash => { :alert => I18n.t("errors.messages.too_young") }
      return true
    end
  end
end
