/**
 * External Dependencies
 */
import React from 'react';
import { has } from 'lodash';
import twemoji from 'twemoji';
import emojiText from 'emoji-text';

/**
 * Internal Dependencies
 */
import Stream from 'reader/stream';
import DocumentHead from 'components/data/document-head';
import EmptyContent from './empty';
import ReaderTags from 'lib/reader-tags/tags';
import ReaderTagActions from 'lib/reader-tags/actions';
import TagSubscriptions from 'lib/reader-tags/subscriptions';
import TagStreamHeader from './header';
import smartSetState from 'lib/react-smart-set-state';
import * as stats from 'reader/stats';
import HeaderBack from 'reader/header-back';
import StreamHeader from 'reader/stream-header'; // pre-refresh
import config from 'config';

const TagStream = React.createClass( {

	propTypes: {
		tag: React.PropTypes.string
	},

	smartSetState: smartSetState,

	getInitialState() {
		return {
			title: this.getTitle(),
			subscribed: this.isSubscribed(),
			canFollow: has( ReaderTags.get( this.props.tag ), 'ID' )
		};
	},

	componentDidMount() {
		ReaderTags.on( 'change', this.updateState );
		TagSubscriptions.on( 'change', this.updateState );
	},

	componentWillUnmount() {
		ReaderTags.off( 'change', this.updateState );
		TagSubscriptions.off( 'change', this.updateState );
	},

	componentWillReceiveProps( nextProps ) {
		if ( nextProps.tag !== this.props.tag ) {
			this.updateState( nextProps );
		}
	},

	updateState( props = this.props ) {
		const newState = {
			title: this.getTitle( props ),
			subscribed: this.isSubscribed( props ),
			canFollow: has( ReaderTags.get( props.tag ), 'ID' )
		};
		this.smartSetState( newState );
	},

	getTitle( props = this.props ) {
		const tag = ReaderTags.get( props.tag );
		if ( ! ( tag && tag.ID ) ) {
			ReaderTagActions.fetchTag( props.tag );
			return props.tag;
		}

		return tag.display_name || tag.slug;
	},

	isSubscribed( props = this.props ) {
		const tag = ReaderTags.get( props.tag );
		if ( ! tag ) {
			return false;
		}
		return TagSubscriptions.isSubscribed( tag.slug );
	},

	toggleFollowing( isFollowing ) {
		const tag = ReaderTags.get( this.props.tag );
		ReaderTagActions[ isFollowing ? 'follow' : 'unfollow' ]( tag );
		stats.recordAction( isFollowing ? 'followed_topic' : 'unfollowed_topic' );
		stats.recordGaEvent( isFollowing ? 'Clicked Follow Topic' : 'Clicked Unfollow Topic', tag.slug );
		stats.recordTrack( isFollowing ? 'calypso_reader_reader_tag_followed' : 'calypso_reader_reader_tag_unfollowed', {
			tag: tag.slug
		} );
	},

	render() {
		const emptyContent = ( <EmptyContent tag={ this.props.tag } /> );
		const title = decodeURIComponent( this.state.title );

		let imageSearchString = this.props.tag;

		// If the tag contains emoji, convert to text equivalent
		if ( twemoji.test( title ) ) {
			imageSearchString = emojiText.convert( title, {
				delimiter: ''
			} );
		}

		return (
			<Stream { ...this.props } listName={ this.state.title } emptyContent={ emptyContent } showFollowInHeader={ true }>
				<DocumentHead title={ this.translate( '%s ‹ Reader', { args: title } ) } />
				{ this.props.showBack && <HeaderBack /> }
				{ config.isEnabled( 'reader/refresh/stream' )
					? <TagStreamHeader
						tag={ this.props.tag }
						title={ title }
						imageSearchString={ imageSearchString }
						showFollow={ this.state.canFollow }
						following={ this.state.subscribed }
						onFollowToggle={ this.toggleFollowing }
						hasBackButton={ this.props.showBack } />
					: <StreamHeader
						isPlaceholder={ false }
						icon={ <svg className="gridicon gridicon__tag" height="32" width="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M16 7H5c-1.105 0-2 .896-2 2v6c0 1.104.895 2 2 2h11l5-5-5-5z"/></g></svg> }
						title={ title }
						showFollow={ this.state.canFollow }
						following={ this.state.subscribed }
						onFollowToggle={ this.toggleFollowing } />
				}
			</Stream>
		);
	}
} );

export default TagStream;
