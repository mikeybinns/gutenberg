/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { store as coreStore } from '@wordpress/core-data';
import { displayShortcut } from '@wordpress/keycodes';
import { privateApis as routerPrivateApis } from '@wordpress/router';
import { store as editorStore } from '@wordpress/editor';

/**
 * Internal dependencies
 */
import { store as editSiteStore } from '../../store';
import {
	currentlyPreviewingTheme,
	isPreviewingTheme,
} from '../../utils/is-previewing-theme';
import { unlock } from '../../lock-unlock';

const { useLocation } = unlock( routerPrivateApis );

export default function SaveButton( {
	className = 'edit-site-save-button__button',
	variant = 'primary',
	showTooltip = true,
	showReviewMessage,
	icon,
	size,
	__next40pxDefaultSize = false,
} ) {
	const { params } = useLocation();
	const { setIsSaveViewOpened } = useDispatch( editSiteStore );
	const { saveDirtyEntities } = unlock( useDispatch( editorStore ) );
	const {
		isSaving,
		isSaveViewOpen,
		previewingThemeName,
		dirtyEntitiesCount,
		isOnlyCurrentEntityDirty,
	} = useSelect(
		( select ) => {
			const {
				__experimentalGetDirtyEntityRecords,
				isSavingEntityRecord,
				isResolving,
			} = select( coreStore );
			const { hasNonPostEntityChanges, isEditedPostDirty } =
				select( editorStore );
			const dirtyEntityRecords = __experimentalGetDirtyEntityRecords();
			const { isSaveViewOpened } = select( editSiteStore );
			const isActivatingTheme = isResolving( 'activateTheme' );
			const currentlyPreviewingThemeId = currentlyPreviewingTheme();
			return {
				dirtyEntitiesCount: dirtyEntityRecords.length,
				isSaving:
					dirtyEntityRecords.some( ( record ) =>
						isSavingEntityRecord(
							record.kind,
							record.name,
							record.key
						)
					) || isActivatingTheme,
				isSaveViewOpen: isSaveViewOpened(),
				// Do not call `getTheme` with null, it will cause a request to
				// the server.
				previewingThemeName: currentlyPreviewingThemeId
					? select( coreStore ).getTheme( currentlyPreviewingThemeId )
							?.name?.rendered
					: undefined,
				// Check if the current entity is the only entity with changes.
				// We have some extra logic for `wp_global_styles` for now, that
				// is used in navigation sidebar.
				isOnlyCurrentEntityDirty:
					( isEditedPostDirty() && ! hasNonPostEntityChanges() ) ||
					params.path?.includes( 'wp_global_styles' ),
			};
		},
		[ params.path ]
	);
	const hasDirtyEntities = !! dirtyEntitiesCount;
	const disabled =
		isSaving || ( ! hasDirtyEntities && ! isPreviewingTheme() );
	const getLabel = () => {
		if ( isPreviewingTheme() ) {
			if ( isSaving ) {
				return sprintf(
					/* translators: %s: The name of theme to be activated. */
					__( 'Activating %s' ),
					previewingThemeName
				);
			} else if ( disabled ) {
				return __( 'Saved' );
			} else if ( hasDirtyEntities ) {
				return sprintf(
					/* translators: %s: The name of theme to be activated. */
					__( 'Activate %s & Save' ),
					previewingThemeName
				);
			}
			return sprintf(
				/* translators: %s: The name of theme to be activated. */
				__( 'Activate %s' ),
				previewingThemeName
			);
		}
		if ( isSaving ) {
			return __( 'Saving' );
		}
		if ( disabled ) {
			return __( 'Saved' );
		}
		if ( ! isOnlyCurrentEntityDirty && showReviewMessage ) {
			return sprintf(
				// translators: %d: number of unsaved changes (number).
				_n(
					'Review %d change…',
					'Review %d changes…',
					dirtyEntitiesCount
				),
				dirtyEntitiesCount
			);
		}
		return __( 'Save' );
	};
	const label = getLabel();
	const onClick = isOnlyCurrentEntityDirty
		? () => saveDirtyEntities()
		: () => setIsSaveViewOpened( true );
	return (
		<Button
			variant={ variant }
			className={ className }
			aria-disabled={ disabled }
			aria-expanded={ isSaveViewOpen }
			isBusy={ isSaving }
			onClick={ disabled ? undefined : onClick }
			label={ label }
			/*
			 * We want the tooltip to show the keyboard shortcut only when the
			 * button does something, i.e. when it's not disabled.
			 */
			shortcut={ disabled ? undefined : displayShortcut.primary( 's' ) }
			/*
			 * Displaying the keyboard shortcut conditionally makes the tooltip
			 * itself show conditionally. This would trigger a full-rerendering
			 * of the button that we want to avoid. By setting `showTooltip`,
			 * the tooltip is always rendered even when there's no keyboard shortcut.
			 */
			showTooltip={ showTooltip }
			icon={ icon }
			__next40pxDefaultSize={ __next40pxDefaultSize }
			size={ size }
		>
			{ label }
		</Button>
	);
}
